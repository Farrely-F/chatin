import { db } from "@/db";
import { chunkEmbeddings } from "@/db/schema";
import { generateEmbeddings } from "@/lib/embedding-model";
import { extractTextFromPdf } from "@/lib/pdf-extractor";
import { chunkText } from "@/lib/text-chunker";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (
  req: NextRequest,
  { params }: { params: { agentId: string } },
) => {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const knowledgeBaseId = formData.get("knowledgeBaseId") as string;

  if (!file || !knowledgeBaseId) {
    return NextResponse.json(
      { error: "Missing file or knowledgeBaseId" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fullText = await extractTextFromPdf(buffer);

  if (!fullText || fullText.trim().length === 0) {
    return NextResponse.json(
      { error: "No readable text found in PDF." },
      { status: 400 },
    );
  }

  const chunks = chunkText(fullText, 200);
  const results = [];

  for (const chunk of chunks) {
    const vector = await generateEmbeddings(chunk);

    results.push(
      db.insert(chunkEmbeddings).values({
        agentId: params.agentId,
        knowledgeBaseId,
        contentChunk: chunk,
        embeddingVector: vector as unknown as number[],
        tokenCount: chunk.split(" ").length,
      }),
    );
  }

  await Promise.allSettled(results);

  return NextResponse.json({
    success: true,
    chunks: chunks.length,
    knowledgeBaseId,
    agentId: params.agentId,
  });
};
