// lib/vector/similarity-search.ts
import { db } from "@/db";
import { chunkEmbeddings } from "@/db/schema";
import { generateEmbeddings } from "@/lib/embedding-model";
import { sql } from "drizzle-orm";

export const searchSimilarChunks = async ({
  query,
  agentId,
  knowledgeBaseId,
  topK = 5,
}: {
  query: string;
  agentId: string;
  knowledgeBaseId: string;
  topK?: number;
}) => {
  const queryEmbedding = await generateEmbeddings(query);

  const results = await db
    .select({
      contentChunk: chunkEmbeddings.contentChunk,
      score: sql`embedding_vector <-> ${queryEmbedding}`.as("score"),
    })
    .from(chunkEmbeddings)
    .where(
      sql`${chunkEmbeddings.agentId} = ${agentId} AND ${chunkEmbeddings.knowledgeBaseId} = ${knowledgeBaseId}`,
    )
    .orderBy(sql`embedding_vector <-> ${queryEmbedding}`)
    .limit(topK);

  return results;
};
