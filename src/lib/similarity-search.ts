import { db } from "@/db";
import { chunkEmbeddings } from "@/db/schema/embeddings";
import { generateEmbeddings } from "@/lib/embedding-model";
import { and, cosineDistance, desc, eq, gt, sql } from "drizzle-orm";

import { cleanText } from "./utils";

type SimilaritySearch = {
  query: string;
  agentId: string;
  topK?: number;
  similarityThreshold?: number;
};

/**
 * Searches for similar content chunks in the database based on the provided query.
 *
 * @param {Object} params - The parameters for the search.
 * @param {string} params.query - The query string to find similar content.
 * @param {string} params.agentId - The ID of the agent performing the search.
 * @param {number} [params.topK=5] - The maximum number of similar chunks to return.
 * @param {number} [params.similarityThreshold=0.5] - The minimum similarity score to consider a chunk as similar.
 * @returns {Promise<Array>} A promise that resolves to an array of similar content chunks, each containing the chunk ID, content, and similarity score.
 */

export const searchSimilarChunks = async ({
  query,
  agentId,
  topK = 5,
  similarityThreshold = 0.5,
}: SimilaritySearch) => {
  const normalizedQuery = cleanText(query);
  const queryEmbedding = await generateEmbeddings(normalizedQuery);

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
        gt(similarity, similarityThreshold),
      ),
    )
    .orderBy((t) => desc(t.similarity))
    .limit(topK);

  return results;
};
