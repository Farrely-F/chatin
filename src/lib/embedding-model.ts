import { google } from "@ai-sdk/google";
import { embed, embedMany } from "ai";

const embeddingModel = google.textEmbeddingModel("text-embedding-004");

export const generateEmbeddings = async (text: string): Promise<number[]> => {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
  });

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
  const batches = chunkArray(texts, MAX_BATCH_SIZE);
  const allEmbeddings: number[][] = [];

  for (const batch of batches) {
    const { embeddings } = await embedMany({
      model: embeddingModel,
      values: batch,
    });

    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
};
