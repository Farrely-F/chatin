"use server";

import { db } from "@/db";
import { aiModels, systemSettings } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const EMBEDDING_PROVIDER_SETTING_KEY = "embedding_provider";
const EMBEDDING_MODEL_ID_SETTING_KEY = "embedding_model_id";

export type EmbeddingProviderSetting = "google" | "openrouter";

function normalizeEmbeddingProvider(
  value: string | null | undefined,
): EmbeddingProviderSetting {
  return value?.toLowerCase() === "google" ? "google" : "openrouter";
}

export async function getEmbeddingProviderSetting(): Promise<EmbeddingProviderSetting> {
  try {
    const [setting] = await db
      .select({ value: systemSettings.value })
      .from(systemSettings)
      .where(eq(systemSettings.key, EMBEDDING_PROVIDER_SETTING_KEY))
      .limit(1);

    if (setting?.value) {
      return normalizeEmbeddingProvider(setting.value);
    }
  } catch (error) {
    console.error("Failed to fetch embedding provider setting", error);
  }

  return normalizeEmbeddingProvider(process.env.EMBEDDING_PROVIDER);
}

export async function updateEmbeddingProviderSetting(
  provider: EmbeddingProviderSetting,
) {
  try {
    await db
      .insert(systemSettings)
      .values({
        key: EMBEDDING_PROVIDER_SETTING_KEY,
        value: provider,
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: {
          value: provider,
          updatedAt: new Date(),
        },
      });

    revalidatePath("/dashboard/model-management");

    return {
      message: "Embedding provider updated successfully",
    };
  } catch (error) {
    console.error("Failed to update embedding provider setting", error);

    return {
      error: "Cannot process your request",
    };
  }
}

export async function getEmbeddingModelIdSetting(): Promise<string | null> {
  try {
    const [setting] = await db
      .select({ value: systemSettings.value })
      .from(systemSettings)
      .where(eq(systemSettings.key, EMBEDDING_MODEL_ID_SETTING_KEY))
      .limit(1);

    return setting?.value ?? null;
  } catch (error) {
    console.error("Failed to fetch embedding model setting", error);
    return null;
  }
}

export async function updateEmbeddingModelIdSetting(
  modelId: string,
  provider: EmbeddingProviderSetting,
) {
  try {
    const [model] = await db
      .select({ id: aiModels.id })
      .from(aiModels)
      .where(
        and(
          eq(aiModels.id, modelId),
          eq(aiModels.provider, provider),
          eq(aiModels.modelType, "embedding"),
          eq(aiModels.isAvailable, true),
        ),
      )
      .limit(1);

    if (!model) {
      return {
        error:
          "Embedding model is invalid. Select an available embedding model for the active provider.",
      };
    }

    await db
      .insert(systemSettings)
      .values({
        key: EMBEDDING_MODEL_ID_SETTING_KEY,
        value: modelId,
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: {
          value: modelId,
          updatedAt: new Date(),
        },
      });

    revalidatePath("/dashboard/model-management");

    return {
      message: "Embedding model updated successfully",
    };
  } catch (error) {
    console.error("Failed to update embedding model setting", error);

    return {
      error: "Cannot process your request",
    };
  }
}
