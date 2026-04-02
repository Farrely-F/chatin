import { db } from "@/db";
import { chunkEmbeddings } from "@/db/schema/embeddings";
import { knowledgeBases } from "@/db/schema/knowledgebases";
import { aiModels } from "@/db/schema/models";
import { generateMultipleEmbeddings } from "@/lib/embedding-model";
import { extractTextFromPdf } from "@/lib/pdf-extractor";
import { splitIntoChunksSemantic } from "@/lib/semantic-chunker";
import { supabase } from "@/lib/supabase/client";
import {
  isAgenticParseContextLimitError,
  isAgenticParseInvalidProviderResponseError,
  parsePdfWithAgent,
} from "@/lib/utility-agent/pdf-parser-agent";
import { cleanText } from "@/lib/utils";
import { canAccessAgentById, withAuth } from "@/middleware/api-middleware";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";

type AgentRouteContext = {
  params: Promise<{ agentId: string }>;
};

const formSchema = z.object({
  file: z.instanceof(File),
  chunkSize: z.preprocess(Number, z.number().int().positive()),
  parseMethod: z.enum(["pdf", "agentic"]).default("pdf"),
  parseModelId: z.uuid().optional(),
  userId: z.string().optional(),
});

type ParseModel = Pick<
  typeof aiModels.$inferSelect,
  "id" | "name" | "provider"
>;

function requireParseModel(parseModel: ParseModel | null): ParseModel {
  if (!parseModel) {
    throw new Error("Parsing model is required for agentic parse");
  }

  return parseModel;
}

async function resolveAgenticParseModel(parseModelId: string) {
  if (!parseModelId) {
    return {
      parseModel: null,
      errorResponse: NextResponse.json(
        { status: false, error: "Parsing model is required for agentic parse" },
        { status: 400 },
      ),
    };
  }

  const selectedModel = await db.query.aiModels.findFirst({
    where: (model, { eq, and }) =>
      and(eq(model.id, parseModelId), eq(model.isAvailable, true)),
    columns: {
      id: true,
      name: true,
      provider: true,
      supportsObjectGeneration: true,
    },
  });

  if (!selectedModel) {
    return {
      parseModel: null,
      errorResponse: NextResponse.json(
        { status: false, error: "Selected parsing model is unavailable" },
        { status: 400 },
      ),
    };
  }

  if (!selectedModel.supportsObjectGeneration) {
    return {
      parseModel: null,
      errorResponse: NextResponse.json(
        {
          status: false,
          error: "Selected parsing model does not support object generation",
        },
        { status: 400 },
      ),
    };
  }

  return {
    parseModel: {
      id: selectedModel.id,
      name: selectedModel.name,
      provider: selectedModel.provider,
    } as ParseModel,
    errorResponse: null,
  };
}

function getAgenticParseErrorResponse(error: unknown) {
  if (isAgenticParseContextLimitError(error)) {
    return NextResponse.json(
      {
        status: false,
        error:
          "Agentic parse exceeded the model context limit. Try PDF parse mode, a smaller PDF, or a higher-context model.",
      },
      { status: 413 },
    );
  }

  if (isAgenticParseInvalidProviderResponseError(error)) {
    return NextResponse.json(
      {
        status: false,
        error:
          "Agentic parse failed because the provider returned an invalid response. Try again, switch model/provider, or use PDF parse mode.",
      },
      { status: 502 },
    );
  }

  return null;
}

async function validateActorForAgent(
  req: Request & { authorized?: { userId?: string } },
  agentId: string,
  requestUserId?: string,
) {
  const access = await canAccessAgentById(req as never, agentId);

  if (!access.allowed || !access.userId) {
    return {
      access: null,
      errorResponse: NextResponse.json(
        { status: false, error: "Agent not found" },
        { status: 404 },
      ),
    };
  }

  if (requestUserId && requestUserId !== access.userId) {
    return {
      access: null,
      errorResponse: NextResponse.json(
        { status: false, error: "Unauthorized user context" },
        { status: 403 },
      ),
    };
  }

  return { access, errorResponse: null };
}

async function postHandler(
  req: Request & {
    formData: () => Promise<FormData>;
    headers: Headers;
    authorized?: { userId?: string };
  },
  { params }: AgentRouteContext,
) {
  const { agentId } = await params;

  let file: File;
  let chunkSize: number;
  let parseMethod: "pdf" | "agentic";
  let parseModelId: string | undefined;
  let requestUserId: string | undefined;

  try {
    const raw = Object.fromEntries(await req.formData());
    ({
      file,
      chunkSize,
      parseMethod,
      parseModelId,
      userId: requestUserId,
    } = formSchema.parse(raw));
  } catch {
    return NextResponse.json(
      { status: false, error: "Invalid form data" },
      { status: 400 },
    );
  }

  // Verify agent exists
  const { access, errorResponse } = await validateActorForAgent(
    req,
    agentId,
    requestUserId,
  );

  if (errorResponse) {
    return errorResponse;
  }

  if (!access?.userId) {
    return NextResponse.json(
      { status: false, error: "Unauthorized user context" },
      { status: 403 },
    );
  }

  const agent = await db.query.agents.findFirst({
    where: (a, { eq }) => eq(a.id, agentId),
    columns: { id: true, organizationId: true },
  });
  if (!agent) {
    return NextResponse.json(
      { status: false, error: "Agent not found" },
      { status: 404 },
    );
  }

  let parseModel: ParseModel | null = null;

  if (parseMethod === "agentic") {
    const { parseModel: resolvedParseModel, errorResponse } =
      await resolveAgenticParseModel(parseModelId ?? "");

    if (errorResponse) {
      return errorResponse;
    }

    parseModel = resolvedParseModel;
  }

  const uuid = randomUUID();
  const fileExt = file.name.split(".").pop() as "pdf";
  const fileName = `${uuid}.${fileExt}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await db.transaction(async (trx) => {
      // Extract and chunk text
      let text = "";

      if (parseMethod === "pdf") {
        text = await extractTextFromPdf(buffer);

        if (!text || text.trim().length === 0) {
          throw new Error(
            "Unable to extract text with PDF parser. Try Agentic parse method.",
          );
        }
      } else {
        text = await parsePdfWithAgent(buffer, requireParseModel(parseModel), {
          agentId,
          organizationId: agent.organizationId ?? undefined,
          requestUserId: access.userId,
        });

        if (!text || text.trim().length === 0) {
          throw new Error("Unable to extract any text from PDF");
        }
      }

      const chunks = await splitIntoChunksSemantic(text, {
        chunkSize,
        preserveTables: true,
        preserveLists: true,
      });
      const embeddings = await generateMultipleEmbeddings(chunks, {
        agentId,
        organizationId: agent.organizationId ?? undefined,
        requestUserId: access.userId,
        source: "embedding",
      });

      if (embeddings.length === 0) {
        throw new Error("Embedding generation failed");
      }

      // Insert knowledge base record
      const [{ id: knowledgeBaseId }] = await trx
        .insert(knowledgeBases)
        .values({
          id: uuid,
          agentId,
          sourceType: fileExt,
          sourceUrl: "",
          fileName: file.name,
          filePath: `${agentId}/${fileName}`,
          embeddingStatus: "pending",
          contentText: cleanText(text),
        })
        .returning({ id: knowledgeBases.id });

      // Insert chunk embeddings in batch
      const rows = chunks.map((chunk, i) => ({
        agentId,
        knowledgeBaseId,
        contentChunk: chunk,
        embeddingVector: embeddings[i],
        tokenCount: chunk.split(" ").length,
      }));
      await trx.insert(chunkEmbeddings).values(rows);

      // Upload file to Supabase
      const { error: uploadError } = await supabase.storage
        .from("knowledge-base")
        .upload(`${agentId}/${fileName}`, buffer, {
          contentType: file.type || "application/octet-stream",
        });
      if (uploadError) throw uploadError;

      const { data: storedPDF } = supabase.storage
        .from("knowledge-base")
        .getPublicUrl(`${agentId}/${fileName}`);
      await trx
        .update(knowledgeBases)
        .set({ sourceUrl: storedPDF.publicUrl, embeddingStatus: "success" })
        .where(eq(knowledgeBases.id, knowledgeBaseId));
    });

    return NextResponse.json(
      {
        status: true,
        message: "Knowledge base created successfully",
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    if (parseMethod === "agentic") {
      const mappedResponse = getAgenticParseErrorResponse(error);
      if (mappedResponse) {
        return mappedResponse;
      }
    }

    console.error("[KB_UPLOAD_ERROR]", error);
    return NextResponse.json(
      {
        status: false,
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 },
    );
  }
}

export const POST = withAuth(postHandler, "write");
