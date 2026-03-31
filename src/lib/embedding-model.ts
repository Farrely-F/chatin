import { db } from "@/db";
import { aiModels, systemSettings } from "@/db/schema";
import { logAgentUsage } from "@/service/agent-usage";
import { google } from "@ai-sdk/google";
import { embed, embedMany } from "ai";
import { and, desc, eq } from "drizzle-orm";

import { embeddingCache } from "./embedding-cache";
import { openrouter } from "./llm";

const EMBEDDING_DIMENSIONS = 768;

const EMBEDDING_PROVIDER_SETTING_KEY = "embedding_provider";
const EMBEDDING_MODEL_ID_SETTING_KEY = "embedding_model_id";
const EMBEDDING_PROVIDER_CACHE_TTL_MS = 60 * 1000;

const OPENROUTER_EMBEDDING_MODEL_NAME =
  process.env.OPENROUTER_EMBEDDING_MODEL_NAME ?? "google/gemini-embedding-001";
const GOOGLE_EMBEDDING_MODEL_NAME =
  process.env.GOOGLE_EMBEDDING_MODEL_NAME ?? "gemini-embedding-001";

type EmbeddingProvider = "google" | "openrouter";

type ActiveEmbeddingModel = {
  modelName: string;
  modelId: string | null;
};

const DEFAULT_EMBEDDING_PROVIDER: EmbeddingProvider =
  (process.env.EMBEDDING_PROVIDER ?? "openrouter").toLowerCase() === "google"
    ? "google"
    : "openrouter";

type EmbeddingLogContext = {
  agentId?: string;
  requestUserId?: string;
  source?: "embedding" | "tool";
};

const GOOGLE_EMBEDDING_INPUT_USD_PER_1M = 0.15;

const embeddingModelIdCache = new Map<string, string | null>();
let embeddingProviderCache: {
  value: EmbeddingProvider;
  expiresAt: number;
} | null = null;
let activeEmbeddingModelCache: {
  provider: EmbeddingProvider;
  value: ActiveEmbeddingModel;
  expiresAt: number;
} | null = null;

function normalizeEmbeddingProvider(value: unknown): EmbeddingProvider {
  return typeof value === "string" && value.toLowerCase() === "google"
    ? "google"
    : "openrouter";
}

async function getActiveEmbeddingProvider(): Promise<EmbeddingProvider> {
  const now = Date.now();

  if (embeddingProviderCache && embeddingProviderCache.expiresAt > now) {
    return embeddingProviderCache.value;
  }

  try {
    const [setting] = await db
      .select({ value: systemSettings.value })
      .from(systemSettings)
      .where(eq(systemSettings.key, EMBEDDING_PROVIDER_SETTING_KEY))
      .limit(1);

    const provider = setting?.value
      ? normalizeEmbeddingProvider(setting.value)
      : DEFAULT_EMBEDDING_PROVIDER;

    embeddingProviderCache = {
      value: provider,
      expiresAt: now + EMBEDDING_PROVIDER_CACHE_TTL_MS,
    };

    return provider;
  } catch (error) {
    console.error("Failed to read embedding provider setting", error);

    embeddingProviderCache = {
      value: DEFAULT_EMBEDDING_PROVIDER,
      expiresAt: now + EMBEDDING_PROVIDER_CACHE_TTL_MS,
    };

    return DEFAULT_EMBEDDING_PROVIDER;
  }
}

function getActiveEmbeddingModelName(provider: EmbeddingProvider): string {
  return provider === "google"
    ? GOOGLE_EMBEDDING_MODEL_NAME
    : OPENROUTER_EMBEDDING_MODEL_NAME;
}

function getEmbeddingModelByName(
  provider: EmbeddingProvider,
  modelName: string,
) {
  return provider === "google"
    ? google.textEmbeddingModel(modelName)
    : openrouter.textEmbeddingModel(modelName, {
        extraBody: {
          dimensions: EMBEDDING_DIMENSIONS,
        },
      });
}

function getEmbeddingProviderOptions(provider: EmbeddingProvider) {
  if (provider !== "google") {
    return undefined;
  }

  return {
    google: {
      outputDimensionality: EMBEDDING_DIMENSIONS,
    },
  };
}

function normalizeDimension(embedding: number[]): number[] {
  if (embedding.length === EMBEDDING_DIMENSIONS) {
    return embedding;
  }

  if (embedding.length > EMBEDDING_DIMENSIONS) {
    return embedding.slice(0, EMBEDDING_DIMENSIONS);
  }

  return [
    ...embedding,
    ...new Array(EMBEDDING_DIMENSIONS - embedding.length).fill(0),
  ];
}

function normalizeCount(value: unknown): number {
  const parsed = Number(value ?? 0);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.floor(parsed));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorCode(error: unknown): string | undefined {
  if (isRecord(error)) {
    const code = error.code;
    if (typeof code === "string" && code.trim().length > 0) {
      return code.trim().slice(0, 64);
    }

    if (typeof code === "number" && Number.isFinite(code)) {
      return String(code).slice(0, 64);
    }
  }

  if (error instanceof Error && error.name.trim().length > 0) {
    return error.name.trim().slice(0, 64);
  }

  return "unknown_error";
}

function extractEmbeddingUsage(result: unknown, provider: EmbeddingProvider) {
  const usage =
    isRecord(result) && isRecord(result.usage) ? result.usage : null;

  const providerMetadata =
    isRecord(result) && isRecord(result.providerMetadata)
      ? result.providerMetadata
      : null;

  const providerEntry =
    providerMetadata && isRecord(providerMetadata[provider])
      ? providerMetadata[provider]
      : null;

  const providerUsage =
    providerEntry && isRecord(providerEntry.usage) ? providerEntry.usage : null;

  const inputTokens = normalizeCount(
    providerUsage?.promptTokens ??
      usage?.promptTokens ??
      usage?.inputTokens ??
      usage?.tokens ??
      usage?.totalTokens,
  );

  const outputTokens = normalizeCount(
    providerUsage?.completionTokens ?? usage?.outputTokens,
  );

  const cachedInputTokens = normalizeCount(
    (isRecord(providerUsage?.promptTokensDetails)
      ? providerUsage.promptTokensDetails.cachedTokens
      : undefined) ?? usage?.cachedInputTokens,
  );

  const totalTokens = normalizeCount(
    providerUsage?.totalTokens ??
      usage?.totalTokens ??
      inputTokens + outputTokens,
  );

  const billedCostUsdRaw =
    (isRecord(providerUsage?.costDetails)
      ? providerUsage.costDetails.upstreamInferenceCost
      : undefined) ?? providerUsage?.cost;
  const billedCostUsd = Number(billedCostUsdRaw);

  return {
    inputTokens,
    outputTokens,
    cachedInputTokens,
    totalTokens,
    billedCostUsd:
      Number.isFinite(billedCostUsd) && billedCostUsd >= 0
        ? billedCostUsd
        : undefined,
  };
}

async function resolveEmbeddingModelId(
  provider: EmbeddingProvider,
  modelName: string,
) {
  const cacheKey = `${provider}:${modelName}`;
  if (embeddingModelIdCache.has(cacheKey)) {
    return embeddingModelIdCache.get(cacheKey) ?? null;
  }

  const [model] = await db
    .select({ id: aiModels.id })
    .from(aiModels)
    .where(
      and(
        eq(aiModels.provider, provider),
        eq(aiModels.name, modelName),
        eq(aiModels.modelType, "embedding"),
      ),
    )
    .limit(1);

  const modelId = model?.id ?? null;
  embeddingModelIdCache.set(cacheKey, modelId);
  return modelId;
}

async function getActiveEmbeddingModelConfig(
  provider: EmbeddingProvider,
): Promise<ActiveEmbeddingModel> {
  const now = Date.now();

  if (
    activeEmbeddingModelCache?.provider === provider &&
    activeEmbeddingModelCache.expiresAt > now
  ) {
    return activeEmbeddingModelCache.value;
  }

  const fallbackModelName = getActiveEmbeddingModelName(provider);

  try {
    const [setting] = await db
      .select({ value: systemSettings.value })
      .from(systemSettings)
      .where(eq(systemSettings.key, EMBEDDING_MODEL_ID_SETTING_KEY))
      .limit(1);

    if (setting?.value) {
      const [configuredModel] = await db
        .select({
          id: aiModels.id,
          name: aiModels.name,
        })
        .from(aiModels)
        .where(
          and(
            eq(aiModels.id, setting.value),
            eq(aiModels.provider, provider),
            eq(aiModels.modelType, "embedding"),
            eq(aiModels.isAvailable, true),
          ),
        )
        .limit(1);

      if (configuredModel) {
        const value = {
          modelName: configuredModel.name,
          modelId: configuredModel.id,
        };

        activeEmbeddingModelCache = {
          provider,
          value,
          expiresAt: now + EMBEDDING_PROVIDER_CACHE_TTL_MS,
        };

        return value;
      }
    }

    const [latestProviderEmbeddingModel] = await db
      .select({
        id: aiModels.id,
        name: aiModels.name,
      })
      .from(aiModels)
      .where(
        and(
          eq(aiModels.provider, provider),
          eq(aiModels.modelType, "embedding"),
          eq(aiModels.isAvailable, true),
        ),
      )
      .orderBy(desc(aiModels.updatedAt))
      .limit(1);

    if (latestProviderEmbeddingModel) {
      const value = {
        modelName: latestProviderEmbeddingModel.name,
        modelId: latestProviderEmbeddingModel.id,
      };

      activeEmbeddingModelCache = {
        provider,
        value,
        expiresAt: now + EMBEDDING_PROVIDER_CACHE_TTL_MS,
      };

      return value;
    }
  } catch (error) {
    console.error(
      "Failed to resolve active embedding model from settings",
      error,
    );
  }

  const fallbackValue = {
    modelName: fallbackModelName,
    modelId: null,
  };

  activeEmbeddingModelCache = {
    provider,
    value: fallbackValue,
    expiresAt: now + EMBEDDING_PROVIDER_CACHE_TTL_MS,
  };

  return fallbackValue;
}

async function logEmbeddingUsage(
  context: EmbeddingLogContext,
  usage: {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens: number;
    totalTokens: number;
    billedCostUsd?: number;
  },
  provider: EmbeddingProvider,
  modelName: string,
  configuredModelId: string | null,
  telemetry?: {
    latencyMs?: number;
    isError?: boolean;
    errorCode?: string;
  },
) {
  if (!context.agentId) {
    return;
  }

  const modelId =
    configuredModelId ?? (await resolveEmbeddingModelId(provider, modelName));
  if (!modelId) {
    console.warn(
      `Embedding model not found in ai_models for ${provider}/${modelName}. Skipping usage log.`,
    );
    return;
  }

  const billedCostUsd =
    usage.billedCostUsd ??
    (provider === "google"
      ? (usage.inputTokens / 1_000_000) * GOOGLE_EMBEDDING_INPUT_USD_PER_1M
      : undefined);

  await logAgentUsage({
    agentId: context.agentId,
    modelId,
    provider,
    requestUserId: context.requestUserId,
    source: context.source ?? "embedding",
    isError: telemetry?.isError,
    errorCode: telemetry?.errorCode,
    latencyMs: telemetry?.latencyMs,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cachedInputTokens: usage.cachedInputTokens,
    totalTokens: usage.totalTokens,
    billedCostUsd,
  });
}

export const generateEmbeddings = async (
  text: string,
  context: EmbeddingLogContext = {},
): Promise<number[]> => {
  const cached = embeddingCache.get(text);
  if (cached) {
    return normalizeDimension(cached);
  }

  const provider = await getActiveEmbeddingProvider();
  const activeModel = await getActiveEmbeddingModelConfig(provider);
  const startedAt = Date.now();

  try {
    const result = await embed({
      model: getEmbeddingModelByName(provider, activeModel.modelName),
      value: text,
      providerOptions: getEmbeddingProviderOptions(provider),
    });

    const embedding = normalizeDimension(result.embedding);

    await logEmbeddingUsage(
      context,
      extractEmbeddingUsage(result, provider),
      provider,
      activeModel.modelName,
      activeModel.modelId,
      {
        isError: false,
        latencyMs: Date.now() - startedAt,
      },
    );

    embeddingCache.set(text, embedding);
    return embedding;
  } catch (error) {
    await logEmbeddingUsage(
      context,
      {
        inputTokens: 0,
        outputTokens: 0,
        cachedInputTokens: 0,
        totalTokens: 0,
      },
      provider,
      activeModel.modelName,
      activeModel.modelId,
      {
        isError: true,
        errorCode: getErrorCode(error),
        latencyMs: Date.now() - startedAt,
      },
    );

    throw error;
  }
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
  context: EmbeddingLogContext = {},
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
    return cachedEmbeddings.map((embedding) => normalizeDimension(embedding));
  }

  const provider = await getActiveEmbeddingProvider();
  const activeModel = await getActiveEmbeddingModelConfig(provider);
  const startedAt = Date.now();

  try {
    const batches = chunkArray(uncachedTexts, MAX_BATCH_SIZE);
    const newEmbeddings: number[][] = new Array(uncachedTexts.length);

    let batchOffset = 0;
    for (const batch of batches) {
      const result = await embedMany({
        model: getEmbeddingModelByName(provider, activeModel.modelName),
        values: batch,
        providerOptions: getEmbeddingProviderOptions(provider),
      });

      await logEmbeddingUsage(
        context,
        extractEmbeddingUsage(result, provider),
        provider,
        activeModel.modelName,
        activeModel.modelId,
        {
          isError: false,
          latencyMs: Date.now() - startedAt,
        },
      );

      for (let i = 0; i < batch.length; i++) {
        const uncachedIdx = batchOffset + i;
        const normalizedEmbedding = normalizeDimension(result.embeddings[i]);
        newEmbeddings[uncachedIdx] = normalizedEmbedding;
        embeddingCache.set(batch[i], normalizedEmbedding);
      }
      batchOffset += batch.length;
    }

    const finalResults: number[][] = new Array(texts.length);

    for (let i = 0; i < cachedIndices.length; i++) {
      finalResults[cachedIndices[i]] = normalizeDimension(cachedEmbeddings[i]);
    }

    for (let i = 0; i < uncachedIndices.length; i++) {
      finalResults[uncachedIndices[i]] = newEmbeddings[i];
    }

    return finalResults;
  } catch (error) {
    await logEmbeddingUsage(
      context,
      {
        inputTokens: 0,
        outputTokens: 0,
        cachedInputTokens: 0,
        totalTokens: 0,
      },
      provider,
      activeModel.modelName,
      activeModel.modelId,
      {
        isError: true,
        errorCode: getErrorCode(error),
        latencyMs: Date.now() - startedAt,
      },
    );

    throw error;
  }
};

export {
  getEmbeddingCacheStats,
  invalidateEmbeddingCache,
} from "./embedding-cache";
export type { EmbeddingCacheStats } from "./embedding-cache";
