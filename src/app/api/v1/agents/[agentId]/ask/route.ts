// src/app/api/agents/[agentId]/ask/route.ts
import { db } from "@/db";
import { chunkEmbeddings } from "@/db/schema";
import { generateEmbeddings } from "@/lib/embedding-model";
import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const model = google("gemini-2.0-flash-001");

export const POST = async (
  req: NextRequest,
  { params }: { params: { agentId: string } },
) => {
  const body = await req.json();
  const { query, knowledgeBaseId, topK = 5 } = body;

  if (!query || !knowledgeBaseId) {
    return NextResponse.json(
      { error: "Missing query or knowledgeBaseId" },
      { status: 400 },
    );
  }

  const queryEmbedding = await generateEmbeddings(query);

  const similarChunks = await db
    .select({
      id: chunkEmbeddings.id,
      content: chunkEmbeddings.contentChunk,
    })
    .from(chunkEmbeddings)
    .where(
      and(
        eq(chunkEmbeddings.agentId, params.agentId),
        eq(chunkEmbeddings.knowledgeBaseId, knowledgeBaseId),
      ),
    )
    .orderBy(sql`embedding_vector <-> ${queryEmbedding}`)
    .limit(topK);

  const contextText = similarChunks.map((c) => c.content).join("\n\n");

  // 3. Stream answer from LLM
  const response = await streamText({
    model,
    prompt: `You are an AI assistant. Use the following context to answer the user’s question.

Context:
${contextText}

Question: ${query}`,
  });

  return new Response(response.toDataStream(), {
    headers: { "Content-Type": "text/plain" },
  });
};
