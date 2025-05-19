import { db } from "@/db";
import { chunkEmbeddings } from "@/db/schema/embeddings";
import { knowledgeBases } from "@/db/schema/knowledgebases";
import { generateMultipleEmbeddings } from "@/lib/embedding-model";
import { extractTextFromPdf } from "@/lib/pdf-extractor";
import { supabase } from "@/lib/supabase/client";
import { splitIntoChunks } from "@/lib/text-chunker";
import { parsePdfWithAgent } from "@/lib/utility-agent/pdf-parser-agent";
import { cleanText } from "@/lib/utils";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const formSchema = z.object({
  file: z.instanceof(File),
  chunkSize: z.preprocess((val) => Number(val), z.number().int().positive()),
});

export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) => {
  const { agentId } = await params;

  let file: File;
  let chunkSize: number;

  try {
    const raw = Object.fromEntries(await req.formData());
    ({ file, chunkSize } = formSchema.parse(raw));
  } catch {
    return NextResponse.json(
      { status: false, error: "Invalid form data" },
      { status: 400 },
    );
  }

  // Verify agent exists
  const agent = await db.query.agents.findFirst({
    where: (a, { eq }) => eq(a.id, agentId),
    columns: { id: true },
  });
  if (!agent) {
    return NextResponse.json(
      { status: false, error: "Agent not found" },
      { status: 404 },
    );
  }

  const uuid = randomUUID();
  const fileExt = file.name.split(".").pop() as "pdf";
  const fileName = `${uuid}.${fileExt}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await db.transaction(async (trx) => {
      // Extract and chunk text
      let text = await extractTextFromPdf(buffer);

      if (!text || text.trim().length === 0) {
        text = await parsePdfWithAgent(buffer);
        if (!text) throw new Error("Unable to extract any text from PDF");
      }

      const chunks = await splitIntoChunks(text, { chunkSize });
      const embeddings = await generateMultipleEmbeddings(chunks);

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
    console.error("[KB_UPLOAD_ERROR]", error);
    return NextResponse.json(
      {
        status: false,
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 },
    );
  }
};
