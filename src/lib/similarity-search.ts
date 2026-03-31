import { db } from "@/db";
import { chunkEmbeddings } from "@/db/schema/embeddings";
import { knowledgeBases } from "@/db/schema/knowledgebases";
import { generateEmbeddings } from "@/lib/embedding-model";
import { and, cosineDistance, desc, eq, gt, sql } from "drizzle-orm";

import {
  type Document as Bm25Document,
  type Bm25Score,
  createBm25Index,
  normalizeScores,
} from "./bm25";
import {
  type ExpansionResult,
  blendQueryEmbeddings,
  expandQuery,
} from "./query-expansion";
import { rerankResults } from "./reranker";
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
  enableQueryExpansion?: boolean;
  queryExpansionWeight?: number;
  enableReranking?: boolean;
  rerankWeight?: number;
};

type SearchResult = {
  id: string;
  knowledgeBaseId?: string;
  content: string;
  similarity: number;
  sourceType?: "pdf" | "doc" | "txt" | "url" | "manual";
  sourceUrl?: string | null;
  fileName?: string | null;
  bm25Score?: number;
  hybridScore?: number;
  rerankScore?: number;
  expansion?: ExpansionResult;
  usedQueryExpansion?: boolean;
  usedReranking?: boolean;
};

type ChunkDocument = Bm25Document & {
  knowledgeBaseId?: string;
  sourceType?: "pdf" | "doc" | "txt" | "url" | "manual";
  sourceUrl?: string | null;
  fileName?: string | null;
};

const DEFAULT_VECTOR_WEIGHT = 0.6;
const DEFAULT_BM25_WEIGHT = 0.4;
const DEFAULT_EXPANSION_WEIGHT = 0.3;

export const searchSimilarChunks = async ({
  query,
  agentId,
  topK = 5,
  similarityThreshold = 0.5,
}: SimilaritySearch) => {
  const normalizedQuery = cleanText(query);
  const normalizedTopK = Math.max(1, Math.floor(topK));
  const normalizedThreshold = Math.min(1, Math.max(0, similarityThreshold));
  const queryEmbedding = await generateEmbeddings(normalizedQuery, {
    agentId,
    source: "embedding",
  });

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

async function fetchAllChunksForAgent(
  agentId: string,
): Promise<ChunkDocument[]> {
  const chunks = await db
    .select({
      id: chunkEmbeddings.id,
      knowledgeBaseId: chunkEmbeddings.knowledgeBaseId,
      content: chunkEmbeddings.contentChunk,
      sourceType: knowledgeBases.sourceType,
      sourceUrl: knowledgeBases.sourceUrl,
      fileName: knowledgeBases.fileName,
    })
    .from(chunkEmbeddings)
    .leftJoin(
      knowledgeBases,
      eq(knowledgeBases.id, chunkEmbeddings.knowledgeBaseId),
    )
    .where(eq(chunkEmbeddings.agentId, agentId));

  return chunks.map((c) => ({
    id: c.id,
    knowledgeBaseId: c.knowledgeBaseId,
    content: c.content,
    sourceType: c.sourceType ?? undefined,
    sourceUrl: c.sourceUrl,
    fileName: c.fileName,
  }));
}

function mergeHybridResults(
  vectorResults: SearchResult[],
  bm25Results: Bm25Score[],
  allChunksById: Map<string, ChunkDocument>,
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
      const matchedChunk = allChunksById.get(bm25Result.id);
      scoreMap.set(bm25Result.id, {
        id: bm25Result.id,
        knowledgeBaseId: matchedChunk?.knowledgeBaseId,
        content: bm25Result.content,
        similarity: 0,
        sourceType: matchedChunk?.sourceType,
        sourceUrl: matchedChunk?.sourceUrl,
        fileName: matchedChunk?.fileName,
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
  enableQueryExpansion = false,
  queryExpansionWeight = DEFAULT_EXPANSION_WEIGHT,
  enableReranking = false,
  rerankWeight = 0.4,
}: HybridSearchOptions): Promise<SearchResult[]> {
  const normalizedQuery = cleanText(query);
  const normalizedTopK = Math.max(1, Math.floor(topK));

  let expansion: ExpansionResult | undefined;
  let usedQueryExpansion = false;
  let queryEmbedding = await generateEmbeddings(normalizedQuery, {
    agentId,
    source: "embedding",
  });

  if (enableQueryExpansion) {
    const expansionResult = await expandQuery(normalizedQuery, agentId, {
      enableExpansion: true,
      initialTopK: 10,
      expansionTerms: 5,
    });

    usedQueryExpansion = true;

    if (expansionResult.addedTerms.length > 0) {
      const expandedEmbedding = await generateEmbeddings(
        cleanText(expansionResult.expandedQuery),
        {
          agentId,
          source: "embedding",
        },
      );
      queryEmbedding = blendQueryEmbeddings(
        queryEmbedding,
        expandedEmbedding,
        queryExpansionWeight,
      );
      expansion = expansionResult;
    }
  }

  const similarity = sql<number>`1 - (${cosineDistance(
    chunkEmbeddings.embeddingVector,
    queryEmbedding,
  )})`;

  const vectorResults = await db
    .select({
      id: chunkEmbeddings.id,
      knowledgeBaseId: chunkEmbeddings.knowledgeBaseId,
      content: chunkEmbeddings.contentChunk,
      similarity,
      sourceType: knowledgeBases.sourceType,
      sourceUrl: knowledgeBases.sourceUrl,
      fileName: knowledgeBases.fileName,
    })
    .from(chunkEmbeddings)
    .leftJoin(
      knowledgeBases,
      eq(knowledgeBases.id, chunkEmbeddings.knowledgeBaseId),
    )
    .where(eq(chunkEmbeddings.agentId, agentId))
    .orderBy((t) => desc(t.similarity))
    .limit(normalizedTopK * 3);

  const normalizedVectorResults: SearchResult[] = vectorResults.map((r) => ({
    ...r,
    sourceType: r.sourceType ?? undefined,
  }));

  if (!enableHybrid) {
    const results = normalizedVectorResults.slice(0, normalizedTopK);
    if (expansion) {
      return results.map((r) => ({ ...r, expansion }));
    }
    return results;
  }

  const allChunks = await fetchAllChunksForAgent(agentId);

  if (allChunks.length === 0) {
    return [];
  }

  const bm25Index = createBm25Index(allChunks);
  const allChunksById = new Map(allChunks.map((chunk) => [chunk.id, chunk]));
  const bm25Results = bm25Index.search(normalizedQuery, normalizedTopK * 3);
  const normalizedBm25 = normalizeScores(bm25Results);

  const mergedResults = mergeHybridResults(
    normalizedVectorResults,
    normalizedBm25,
    allChunksById,
    vectorWeight,
    bm25Weight,
  );

  let finalResults = mergedResults.slice(0, normalizedTopK);
  let usedReranking = false;

  if (enableReranking && finalResults.length > 0) {
    const reranked = await rerankResults(normalizedQuery, finalResults, {
      enableReranking: true,
      rerankTopK: normalizedTopK,
      rerankWeight: rerankWeight ?? 0.4,
      agentId,
    });

    finalResults = finalResults.map((r, idx) => ({
      ...r,
      rerankScore: reranked[idx]?.rerankScore ?? r.similarity,
    }));
    usedReranking = true;
  }

  if (expansion) {
    return finalResults.map((r) => ({
      ...r,
      expansion,
      usedQueryExpansion,
      usedReranking,
    }));
  }

  return finalResults.map((r) => ({
    ...r,
    usedQueryExpansion,
    usedReranking,
  }));
}

export type { SearchResult, HybridSearchOptions };
