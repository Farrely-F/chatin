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

export const generateMultipleEmbeddings = async (
  texts: string[],
): Promise<number[][]> => {
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: texts,
  });

  return embeddings;
};
