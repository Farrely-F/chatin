import { google } from "@ai-sdk/google";
import { embed, embedMany } from "ai";

import {
  type EmbeddingCacheStats,
  embeddingCache,
  getEmbeddingCacheStats,
  invalidateEmbeddingCache,
} from "./embedding-cache";

const embeddingModel = google.textEmbeddingModel("gemini-embedding-001");
const EMBEDDING_DIMENSIONS = 768;

export const generateEmbeddings = async (text: string): Promise<number[]> => {
  const cached = embeddingCache.get(text);
  if (cached) {
    return cached;
  }

  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
    providerOptions: {
      google: {
        outputDimensionality: EMBEDDING_DIMENSIONS,
      },
    },
  });

  embeddingCache.set(text, embedding);
  return embedding;
};

const MAX_BATCH_SIZE = 100;

function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

export const generateMultipleEmbeddings = async (
  texts: string[],
): Promise<number[][]> => {
  const cachedIndices: number[] = [];
  const cachedEmbeddings: number[][] = [];
  const uncachedTexts: string[] = [];
  const uncachedIndices: number[] = [];

  for (let i = 0; i < texts.length; i++) {
    const cached = embeddingCache.get(texts[i]);
    if (cached) {
      cachedIndices.push(i);
      cachedEmbeddings.push(cached);
    } else {
      uncachedTexts.push(texts[i]);
      uncachedIndices.push(i);
    }
  }

  if (uncachedTexts.length === 0) {
    return cachedEmbeddings;
  }

  const batches = chunkArray(uncachedTexts, MAX_BATCH_SIZE);
  const newEmbeddings: number[][] = new Array(uncachedTexts.length);

  let batchOffset = 0;
  for (const batch of batches) {
    const { embeddings } = await embedMany({
      model: embeddingModel,
      values: batch,
      providerOptions: {
        google: {
          outputDimensionality: EMBEDDING_DIMENSIONS,
        },
      },
    });

    for (let i = 0; i < batch.length; i++) {
      const uncachedIdx = batchOffset + i;
      newEmbeddings[uncachedIdx] = embeddings[i];
      embeddingCache.set(batch[i], embeddings[i]);
    }
    batchOffset += batch.length;
  }

  const finalResults: number[][] = new Array(texts.length);

  for (let i = 0; i < cachedIndices.length; i++) {
    finalResults[cachedIndices[i]] = cachedEmbeddings[i];
  }

  for (let i = 0; i < uncachedIndices.length; i++) {
    finalResults[uncachedIndices[i]] = newEmbeddings[i];
  }

  return finalResults;
};

export { getEmbeddingCacheStats, invalidateEmbeddingCache };
export type { EmbeddingCacheStats };
