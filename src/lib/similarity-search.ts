import { db } from "@/db";
import { chunkEmbeddings } from "@/db/schema/embeddings";
import { generateEmbeddings } from "@/lib/embedding-model";
import { and, cosineDistance, desc, eq, gt, sql } from "drizzle-orm";

import {
  type Bm25Score,
  type Document,
  createBm25Index,
  normalizeScores,
} from "./bm25";
import { cleanText } from "./utils";

type SimilaritySearch = {
  query: string;
  agentId: string;
  topK?: number;
  similarityThreshold?: number;
};

type HybridSearchOptions = SimilaritySearch & {
  vectorWeight?: number;
  bm25Weight?: number;
  enableHybrid?: boolean;
};

type SearchResult = {
  id: string;
  content: string;
  similarity: number;
  bm25Score?: number;
  hybridScore?: number;
};

const DEFAULT_VECTOR_WEIGHT = 0.6;
const DEFAULT_BM25_WEIGHT = 0.4;

export const searchSimilarChunks = async ({
  query,
  agentId,
  topK = 5,
  similarityThreshold = 0.5,
}: SimilaritySearch) => {
  const normalizedQuery = cleanText(query);
  const normalizedTopK = Math.max(1, Math.floor(topK));
  const normalizedThreshold = Math.min(1, Math.max(0, similarityThreshold));
  const queryEmbedding = await generateEmbeddings(normalizedQuery);

  const similarity = sql<number>`1 - (${cosineDistance(
    chunkEmbeddings.embeddingVector,
    queryEmbedding,
  )})`;

  const thresholdResults = await db
    .select({
      id: chunkEmbeddings.id,
      content: chunkEmbeddings.contentChunk,
      similarity,
    })
    .from(chunkEmbeddings)
    .where(
      and(
        eq(chunkEmbeddings.agentId, agentId),
        gt(similarity, normalizedThreshold),
      ),
    )
    .orderBy((t) => desc(t.similarity))
    .limit(normalizedTopK);

  if (thresholdResults.length >= normalizedTopK) {
    return thresholdResults;
  }

  const fallbackResults = await db
    .select({
      id: chunkEmbeddings.id,
      content: chunkEmbeddings.contentChunk,
      similarity,
    })
    .from(chunkEmbeddings)
    .where(eq(chunkEmbeddings.agentId, agentId))
    .orderBy((t) => desc(t.similarity))
    .limit(normalizedTopK);

  if (thresholdResults.length === 0) {
    return fallbackResults;
  }

  const mergedById = new Map(
    [...thresholdResults, ...fallbackResults].map((row) => [row.id, row]),
  );

  return Array.from(mergedById.values())
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, normalizedTopK);
};

async function fetchAllChunksForAgent(agentId: string): Promise<Document[]> {
  const chunks = await db
    .select({
      id: chunkEmbeddings.id,
      content: chunkEmbeddings.contentChunk,
    })
    .from(chunkEmbeddings)
    .where(eq(chunkEmbeddings.agentId, agentId));

  return chunks.map((c) => ({ id: c.id, content: c.content }));
}

function mergeHybridResults(
  vectorResults: SearchResult[],
  bm25Results: Bm25Score[],
  vectorWeight: number,
  bm25Weight: number,
): SearchResult[] {
  const scoreMap = new Map<string, SearchResult>();

  for (const result of vectorResults) {
    scoreMap.set(result.id, {
      ...result,
      hybridScore: result.similarity * vectorWeight,
    });
  }

  for (const bm25Result of bm25Results) {
    if (scoreMap.has(bm25Result.id)) {
      const existing = scoreMap.get(bm25Result.id)!;
      existing.bm25Score = bm25Result.score;
      existing.hybridScore =
        existing.similarity * vectorWeight + bm25Result.score * bm25Weight;
    } else {
      scoreMap.set(bm25Result.id, {
        id: bm25Result.id,
        content: bm25Result.content,
        similarity: 0,
        bm25Score: bm25Result.score,
        hybridScore: bm25Result.score * bm25Weight,
      });
    }
  }

  return Array.from(scoreMap.values()).sort(
    (a, b) => (b.hybridScore ?? 0) - (a.hybridScore ?? 0),
  );
}

export async function searchSimilarChunksHybrid({
  query,
  agentId,
  topK = 5,
  vectorWeight = DEFAULT_VECTOR_WEIGHT,
  bm25Weight = DEFAULT_BM25_WEIGHT,
  enableHybrid = true,
}: HybridSearchOptions): Promise<SearchResult[]> {
  const normalizedQuery = cleanText(query);
  const normalizedTopK = Math.max(1, Math.floor(topK));

  const queryEmbedding = await generateEmbeddings(normalizedQuery);

  const similarity = sql<number>`1 - (${cosineDistance(
    chunkEmbeddings.embeddingVector,
    queryEmbedding,
  )})`;

  const vectorResults = await db
    .select({
      id: chunkEmbeddings.id,
      content: chunkEmbeddings.contentChunk,
      similarity,
    })
    .from(chunkEmbeddings)
    .where(eq(chunkEmbeddings.agentId, agentId))
    .orderBy((t) => desc(t.similarity))
    .limit(normalizedTopK * 3);

  if (!enableHybrid) {
    return vectorResults.slice(0, normalizedTopK);
  }

  const allChunks = await fetchAllChunksForAgent(agentId);

  if (allChunks.length === 0) {
    return [];
  }

  //TODO: The current in-memory BM25 rebuilds the index on every search. For large knowledge bases, consider caching the BM25 index or pre-computing term frequencies at ingest time.

  const bm25Index = createBm25Index(allChunks);
  const bm25Results = bm25Index.search(normalizedQuery, normalizedTopK * 3);
  const normalizedBm25 = normalizeScores(bm25Results);

  const mergedResults = mergeHybridResults(
    vectorResults,
    normalizedBm25,
    vectorWeight,
    bm25Weight,
  );

  return mergedResults.slice(0, normalizedTopK);
}

export type { SearchResult, HybridSearchOptions };
