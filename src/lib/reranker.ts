import { google } from "@ai-sdk/google";
import { embed } from "ai";

type RerankResult = {
  id: string;
  content: string;
  originalScore: number;
  rerankScore: number;
};

type RerankOptions = {
  enableReranking?: boolean;
  rerankTopK?: number;
  rerankWeight?: number;
};

const CROSS_ENCODER_DIMENSIONS = 768;

async function generateCrossEncoderScore(
  query: string,
  document: string,
): Promise<number> {
  const combinedText = `${query} [SEP] ${document}`;

  const { embedding } = await embed({
    model: google.textEmbeddingModel("gemini-embedding-001"),
    value: combinedText,
    providerOptions: {
      google: {
        outputDimensionality: CROSS_ENCODER_DIMENSIONS,
      },
    },
  });

  return embedding[0] ?? 0;
}

function normalizeScores(scores: number[]): number[] {
  if (scores.length === 0) return [];
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  if (max === min) return scores.map(() => 1);
  return scores.map((s) => (s - min) / (max - min));
}

export async function rerankResults(
  query: string,
  results: Array<{ id: string; content: string; similarity: number }>,
  options: RerankOptions = {},
): Promise<RerankResult[]> {
  const {
    enableReranking = true,
    rerankTopK = 5,
    rerankWeight = 0.4,
  } = options;

  if (!enableReranking || results.length === 0) {
    return results.map((r) => ({
      id: r.id,
      content: r.content,
      originalScore: r.similarity,
      rerankScore: r.similarity,
    }));
  }

  const rerankCandidates = results.slice(0, rerankTopK * 2);

  const crossEncoderScores: number[] = [];
  for (const result of rerankCandidates) {
    const score = await generateCrossEncoderScore(query, result.content);
    crossEncoderScores.push(Math.abs(score));
  }

  const normalizedCrossEncoder = normalizeScores(crossEncoderScores);

  const rerankedResults: RerankResult[] = rerankCandidates.map(
    (result, idx) => ({
      id: result.id,
      content: result.content,
      originalScore: result.similarity,
      rerankScore:
        result.similarity * (1 - rerankWeight) +
        normalizedCrossEncoder[idx] * rerankWeight,
    }),
  );

  return rerankedResults.sort((a, b) => b.rerankScore - a.rerankScore);
}

export type { RerankResult, RerankOptions };
