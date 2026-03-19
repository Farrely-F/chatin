import { db } from "@/db";
import { chunkEmbeddings } from "@/db/schema/embeddings";
import { generateEmbeddings } from "@/lib/embedding-model";
import { cosineDistance, desc, eq, sql } from "drizzle-orm";

import { cleanText } from "./utils";

type QueryExpansionOptions = {
  enableExpansion?: boolean;
  initialTopK?: number;
  expansionTerms?: number;
  expansionWeight?: number;
};

type ExpansionResult = {
  originalQuery: string;
  expandedQuery: string;
  addedTerms: string[];
};

const DEFAULT_INITIAL_TOP_K = 10;
const DEFAULT_EXPANSION_TERMS = 5;

function tokenizeQuery(text: string): string[] {
  return text
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function computeTfIdfFromChunks(
  chunks: { content: string }[],
  queryTokens: string[],
): Map<string, number> {
  const termFreqs = new Map<string, number>();
  const docCount = chunks.length;
  const docFreqs = new Map<string, number>();

  for (const chunk of chunks) {
    const tokens = tokenizeQuery(chunk.content);
    const uniqueTokens = new Set(tokens);

    for (const token of uniqueTokens) {
      termFreqs.set(
        token,
        (termFreqs.get(token) || 0) + tokens.filter((t) => t === token).length,
      );
      docFreqs.set(token, (docFreqs.get(token) || 0) + 1);
    }
  }

  const tfidfScores = new Map<string, number>();
  const queryTokenSet = new Set(queryTokens);

  for (const [term, tf] of termFreqs) {
    const df = docFreqs.get(term) || 1;
    const idf = Math.log(docCount / df);
    const tfidf = tf * idf;

    if (!queryTokenSet.has(term) && idf > 0.5) {
      tfidfScores.set(term, tfidf);
    }
  }

  return tfidfScores;
}

function extractKeyTerms(
  chunks: { content: string }[],
  maxTerms: number,
): string[] {
  if (chunks.length === 0) return [];

  const queryTokens = chunks.flatMap((c) => tokenizeQuery(c.content));
  const tfidfScores = computeTfIdfFromChunks(chunks, queryTokens);

  const sortedTerms = Array.from(tfidfScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTerms)
    .map(([term]) => term);

  return sortedTerms;
}

async function fetchTopChunksForExpansion(
  query: string,
  agentId: string,
  topK: number,
) {
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
    .where(eq(chunkEmbeddings.agentId, agentId))
    .orderBy((t) => desc(t.similarity))
    .limit(topK);

  return results;
}

export async function expandQuery(
  query: string,
  agentId: string,
  options: QueryExpansionOptions = {},
): Promise<ExpansionResult> {
  const {
    enableExpansion = true,
    initialTopK = DEFAULT_INITIAL_TOP_K,
    expansionTerms = DEFAULT_EXPANSION_TERMS,
  } = options;

  const originalQuery = query.trim();

  if (!enableExpansion) {
    return {
      originalQuery,
      expandedQuery: originalQuery,
      addedTerms: [],
    };
  }

  if (originalQuery.length < 3) {
    return {
      originalQuery,
      expandedQuery: originalQuery,
      addedTerms: [],
    };
  }

  const topChunks = await fetchTopChunksForExpansion(
    originalQuery,
    agentId,
    initialTopK,
  );

  if (topChunks.length === 0) {
    return {
      originalQuery,
      expandedQuery: originalQuery,
      addedTerms: [],
    };
  }

  const addedTerms = extractKeyTerms(topChunks, expansionTerms);

  if (addedTerms.length === 0) {
    return {
      originalQuery,
      expandedQuery: originalQuery,
      addedTerms: [],
    };
  }

  const expandedQuery = `${originalQuery} ${addedTerms.join(" ")}`;

  return {
    originalQuery,
    expandedQuery,
    addedTerms,
  };
}

export async function embedExpandedQuery(
  query: string,
  agentId: string,
  options: QueryExpansionOptions = {},
): Promise<{
  originalEmbedding: number[];
  expandedEmbedding: number[];
  expansion: ExpansionResult;
}> {
  const expansion = await expandQuery(query, agentId, options);

  const [originalEmbedding, expandedEmbedding] = await Promise.all([
    generateEmbeddings(cleanText(expansion.originalQuery)),
    generateEmbeddings(cleanText(expansion.expandedQuery)),
  ]);

  return {
    originalEmbedding,
    expandedEmbedding,
    expansion,
  };
}

export function blendQueryEmbeddings(
  originalEmbedding: number[],
  expandedEmbedding: number[],
  expansionWeight: number,
): number[] {
  if (originalEmbedding.length !== expandedEmbedding.length) {
    return expandedEmbedding;
  }

  return originalEmbedding.map(
    (orig, i) =>
      orig * (1 - expansionWeight) + expandedEmbedding[i] * expansionWeight,
  );
}

export type { QueryExpansionOptions, ExpansionResult };
