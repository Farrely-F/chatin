import { db } from "@/db";
import { chunkEmbeddings } from "@/db/schema/embeddings";
import { knowledgeBases } from "@/db/schema/knowledgebases";
import { generateEmbeddings } from "@/lib/embedding-model";
import { extractTextFromPdf } from "@/lib/pdf-extractor";
import { supabase } from "@/lib/supabase/client";
import { splitIntoChunks } from "@/lib/text-chunker";
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
  const chunkSize = parseInt(formData.get("chunkSize") as string, 10);

  const { agentId } = await params;

  if (!file || !agentId || !userId) {
    return NextResponse.json(
      { error: "Missing required fields" },
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

  const { error: uploadError } = await supabase.storage
    .from("knowledge-base")
    .upload(`${agentId}/${fileName}`, buffer, {
      contentType: file.type || "application/octet-stream",
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "Upload failed", detail: uploadError.message },
      { status: 500 },
    );
  }

  const publicUrl = supabase.storage
    .from("knowledge-base")
    .getPublicUrl(`${agentId}/${fileName}`).data.publicUrl;

  // Store metadata to knowledge_bases
  const [{ id: knowledgeBaseId }] = await db
    .insert(knowledgeBases)
    .values({
      id: uuid,
      agentId,
      sourceType: fileExt as "pdf" | "doc" | "txt" | "url" | "manual",
      sourceUrl: publicUrl,
      fileName: file.name,
      filePath: `${agentId}/${fileName}`,
    })
    .returning({ id: knowledgeBases.id });

  // Extract text and embed
  let text;
  try {
    text = await extractTextFromPdf(buffer);
    console.log("Successfully extracted text from PDF");
  } catch (error) {
    console.error("Error in PDF extraction:", error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: "PDF extraction failed", detail: error.message },
        { status: 500 },
      );
    }
  }

  //   CONSIDER USING HIGHER CHUNK SIZE TO SAVE ON COST BUT LOWER ACCURACY
  const chunks = splitIntoChunks(text!, chunkSize || 500);

  const operations = chunks.map(async (chunk) => {
    const vector = await generateEmbeddings(chunk);
    return db.insert(chunkEmbeddings).values({
      agentId,
      knowledgeBaseId,
      contentChunk: chunk,
      embeddingVector: vector,
      tokenCount: chunk.split(" ").length,
    });
  });

  await Promise.all(operations);

  await db
    .update(knowledgeBases)
    .set({ embeddingStatus: "success" })
    .where(eq(knowledgeBases.id, knowledgeBaseId));

  return NextResponse.json({ success: true, chunks: chunks.length });
};
