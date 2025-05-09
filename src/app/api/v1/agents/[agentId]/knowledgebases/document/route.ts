import { db } from "@/db";
import { chunkEmbeddings } from "@/db/schema/embeddings";
import { knowledgeBases } from "@/db/schema/knowledgebases";
import { generateMultipleEmbeddings } from "@/lib/embedding-model";
import { extractTextFromPdf } from "@/lib/pdf-extractor";
import { supabase } from "@/lib/supabase/client";
import { splitIntoChunks } from "@/lib/text-chunker";
import { cleanText } from "@/lib/utils";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) => {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const userId = formData.get("userId") as string;
  const chunkSize = parseInt(formData.get("chunkSize") as string);

  const { agentId } = await params;

  if (!file || !agentId || !userId) {
    return NextResponse.json(
      {
        status: false,
        error: "Missing required fields",
      },
      { status: 400 },
    );
  }

  // Check for exisiting agentId first
  const agent = await db.query.agents.findFirst({
    where: (agents, { eq }) => eq(agents.id, agentId),
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const uuid = randomUUID();

  const fileExt = file.name.split(".").pop();
  const fileName = `${uuid}.${fileExt}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const res = await db.transaction(async (trx) => {
      const text = await extractTextFromPdf(buffer);

      if (!text) {
        return NextResponse.json(
          {
            status: false,
            error: "invalid PDF, unable to extract text",
          },
          { status: 500 },
        );
      }

      const [{ id: knowledgeBaseId }] = await trx
        .insert(knowledgeBases)
        .values({
          id: uuid,
          agentId,
          sourceType: fileExt as "pdf" | "doc" | "txt" | "url" | "manual",
          sourceUrl: "",
          fileName: file.name,
          filePath: `${agentId}/${fileName}`,
          embeddingStatus: "pending",
          contentText: cleanText(text),
        })
        .returning({ id: knowledgeBases.id });

      const chunks = await splitIntoChunks(text, {
        chunkSize,
      });
      const embeddings = await generateMultipleEmbeddings(chunks);

      if (!embeddings.length || embeddings.length === 0) {
        throw new Error("Failed to generate embeddings");
      }

      const chunkRows = chunks.map((chunk, index) => ({
        agentId,
        knowledgeBaseId,
        contentChunk: chunk,
        embeddingVector: embeddings[index],
        tokenCount: chunk.split(" ").length,
      }));

      await trx.insert(chunkEmbeddings).values(chunkRows);

      const { error: uploadError } = await supabase.storage
        .from("knowledge-base")
        .upload(`${agentId}/${fileName}`, buffer, {
          contentType: file.type || "application/octet-stream",
        });

      if (uploadError) {
        throw uploadError;
      }

      const publicUrl = supabase.storage
        .from("knowledge-base")
        .getPublicUrl(`${agentId}/${fileName}`).data.publicUrl;

      await trx
        .update(knowledgeBases)
        .set({ sourceUrl: publicUrl, embeddingStatus: "success" })
        .where(eq(knowledgeBases.id, knowledgeBaseId));

      return NextResponse.json(
        { status: true, message: "Knowledge base created successfully" },
        { status: 200 },
      );
    });

    return res;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        status: false,
        error: "Failed to create knowledge base",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
};
