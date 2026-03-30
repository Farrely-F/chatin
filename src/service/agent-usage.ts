"use server";

import { db } from "@/db";
import { agentUsageLogs, aiModels } from "@/db/schema";
import { eq } from "drizzle-orm";

type UsageSource = "stream" | "text";

type UsageInput = {
  agentId: string;
  modelId: string;
  provider: string;
  requestUserId?: string;
  source: UsageSource;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  totalTokens?: number;
  billedCostUsd?: number;
};

type TokenPricing = {
  input: number;
  output: number;
};

const DEFAULT_FX_USD_TO_IDR = Number(process.env.USD_IDR_FALLBACK ?? 16000);
const FX_CACHE_TTL_MS = 10 * 60 * 1000;
const MODEL_PRICING_CACHE_TTL_MS = 5 * 60 * 1000;

let fxCache: { value: number; expiresAt: number } | null = null;
const modelPricingCache = new Map<
  string,
  { pricing: TokenPricing; expiresAt: number }
>();

function normalizeCount(value: number | undefined): number {
  const parsed = Number(value ?? 0);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.floor(parsed));
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizeNonNegative(
  value: number | string | null | undefined,
): number {
  const parsed = Number(value ?? 0);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, parsed);
}

async function getUsdToIdrRate(): Promise<number> {
  const now = Date.now();

  if (fxCache && fxCache.expiresAt > now) {
    return fxCache.value;
  }

  const endpoint =
    process.env.USD_IDR_EXCHANGE_RATE_URL ??
    "https://open.er-api.com/v6/latest/USD";

  try {
    const response = await fetch(endpoint, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });

    if (!response.ok) {
      throw new Error(`Exchange rate request failed: ${response.status}`);
    }

    const payload = (await response.json()) as {
      rates?: { IDR?: number };
      conversion_rates?: { IDR?: number };
      result?: string;
    };

    const candidate =
      payload.rates?.IDR ?? payload.conversion_rates?.IDR ?? Number.NaN;

    if (!Number.isFinite(candidate) || candidate <= 0) {
      throw new Error("Invalid exchange rate payload");
    }

    fxCache = {
      value: candidate,
      expiresAt: now + FX_CACHE_TTL_MS,
    };

    return candidate;
  } catch (error) {
    console.error("Failed to fetch live USD/IDR rate. Using fallback.", error);

    return Number.isFinite(DEFAULT_FX_USD_TO_IDR) && DEFAULT_FX_USD_TO_IDR > 0
      ? DEFAULT_FX_USD_TO_IDR
      : 16000;
  }
}

async function getModelPricingPer1M(modelId: string): Promise<TokenPricing> {
  const now = Date.now();
  const cached = modelPricingCache.get(modelId);

  if (cached && cached.expiresAt > now) {
    return cached.pricing;
  }

  const [modelRow] = await db
    .select({
      inputCostPer1mTokens: aiModels.inputCostPer1mTokens,
      outputCostPer1mTokens: aiModels.outputCostPer1mTokens,
    })
    .from(aiModels)
    .where(eq(aiModels.id, modelId))
    .limit(1);

  if (!modelRow) {
    console.warn(
      `Model pricing not found for modelId=${modelId}. Usage cost defaults to 0.`,
    );

    return { input: 0, output: 0 };
  }

  const pricing = {
    input: normalizeNonNegative(modelRow.inputCostPer1mTokens),
    output: normalizeNonNegative(modelRow.outputCostPer1mTokens),
  };

  modelPricingCache.set(modelId, {
    pricing,
    expiresAt: now + MODEL_PRICING_CACHE_TTL_MS,
  });

  return pricing;
}

export async function logAgentUsage(input: UsageInput) {
  const inputTokens = normalizeCount(input.inputTokens);
  const outputTokens = normalizeCount(input.outputTokens);
  const cachedInputTokens = normalizeCount(input.cachedInputTokens);
  const totalTokens = normalizeCount(
    input.totalTokens ?? inputTokens + outputTokens,
  );

  const pricing = await getModelPricingPer1M(input.modelId);
  const estimatedCostUsd =
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output;
  const billedCostUsd = Number(input.billedCostUsd);
  const costUsd =
    Number.isFinite(billedCostUsd) && billedCostUsd >= 0
      ? billedCostUsd
      : estimatedCostUsd;
  const usdToIdr = await getUsdToIdrRate();
  const costIdr = costUsd * usdToIdr;

  try {
    await db.insert(agentUsageLogs).values({
      agentId: input.agentId,
      modelId: input.modelId,
      requestUserId: input.requestUserId,
      source: input.source,
      provider: input.provider,
      inputTokens,
      outputTokens,
      cachedInputTokens,
      totalTokens,
      costUsd: round(costUsd, 6).toFixed(6),
      fxUsdToIdr: round(usdToIdr, 4).toFixed(4),
      costIdr: round(costIdr, 2).toFixed(2),
    });
  } catch (error) {
    console.error("Failed to persist agent usage log", error);
  }
}
