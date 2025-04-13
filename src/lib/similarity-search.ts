import { db } from "@/db";
import { chunkEmbeddings } from "@/db/schema/embeddings";
import { generateEmbeddings } from "@/lib/embedding-model";
import { and, cosineDistance, desc, eq, gt, sql } from "drizzle-orm";

export const searchSimilarChunks = async ({
  query,
  agentId,
  knowledgeBaseId,
  topK = 5,
  similarityThreshold = 0.5,
}: {
  query: string;
  agentId: string;
  knowledgeBaseId: string;
  topK?: number;
  similarityThreshold?: number;
}) => {
  const queryEmbedding = await generateEmbeddings(query);

  const similarity = sql<number>`1 - (${cosineDistance(
    chunkEmbeddings.embeddingVector,
    queryEmbedding,
  )})`;

  const results = await db
    .select({
      id: chunkEmbeddings.id,
      content: chunkEmbeddings.contentChunk,
      similarity,
    })
    .from(chunkEmbeddings)
    .where(
      and(
        eq(chunkEmbeddings.agentId, agentId),
        eq(chunkEmbeddings.knowledgeBaseId, knowledgeBaseId),
        gt(similarity, similarityThreshold),
      ),
    )
    .orderBy((t) => desc(t.similarity))
    .limit(topK);

  return results;
};
