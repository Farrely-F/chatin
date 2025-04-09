// src/app/api/agents/[agentId]/search/route.ts
import { db } from "@/db";
import { chunkEmbeddings } from "@/db/schema";
import { generateEmbeddings } from "@/lib/embedding-model";
import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

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

  const results = await db
    .select({
      id: chunkEmbeddings.id,
      content: chunkEmbeddings.contentChunk,
      similarity: sql<number>`embedding_vector <-> ${queryEmbedding}`.as(
        "similarity",
      ),
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

  return NextResponse.json({ results });
};
