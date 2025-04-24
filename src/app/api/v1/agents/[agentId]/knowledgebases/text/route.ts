import { db } from "@/db";
import { chunkEmbeddings, knowledgeBases } from "@/db/schema";
import { generateMultipleEmbeddings } from "@/lib/embedding-model";
import { splitIntoChunks } from "@/lib/text-chunker";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { title, content } = await req.json();
  const { agentId } = await params;

  if (!title || !content) {
    return NextResponse.json(
      { error: "Missing name or text" },
      { status: 400 },
    );
  }

  const [{ id: knowledgeBaseId }] = await db
    .insert(knowledgeBases)
    .values({
      agentId,
      sourceType: "txt",
      fileName: title,
      contentText: content,
    })
    .returning({ id: knowledgeBases.id });

  if (!knowledgeBaseId) {
    return NextResponse.json(
      { error: "Failed to create knowledge base" },
      { status: 500 },
    );
  }

  const chunks = splitIntoChunks(content, 500);
  const embeddings = await generateMultipleEmbeddings(chunks);

  const insertData = embeddings.map((embedding, i) => ({
    knowledgeBaseId,
    agentId,
    contentChunk: chunks[i],
    embeddingVector: embedding,
    tokenCount: chunks[i].split(" ").length,
  }));

  const [{ id: chunkEmbeddingId }] = await db
    .insert(chunkEmbeddings)
    .values(insertData)
    .returning({ id: chunkEmbeddings.id });

  if (!chunkEmbeddingId) {
    return NextResponse.json(
      { error: "Failed to create chunk embeddings" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { success: true, message: "Knowledge base created successfully" },
    { status: 200 },
  );
}
