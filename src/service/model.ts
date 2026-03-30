"use server";

import { db } from "@/db";
import { agents, aiModels } from "@/db/schema";
import { ModelSchema } from "@/schema/model-schema";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type ModelConnectedAgent = {
  id: string;
  name: string;
  slug: string;
};

export type ModelDeleteReplacement = {
  id: string;
  name: string;
  provider: string;
};

export type ModelDeleteImpact = {
  connectedAgents: ModelConnectedAgent[];
  replacementModels: ModelDeleteReplacement[];
};

const DELETE_MODEL_ERROR_MESSAGES: Record<string, string> = {
  MODEL_IN_USE:
    "This model is currently used by one or more agents. Reassign those agents first.",
  INVALID_REPLACEMENT_MODEL: "Please select a different replacement model.",
  REPLACEMENT_MODEL_NOT_FOUND: "Replacement model was not found.",
  REPLACEMENT_MODEL_UNAVAILABLE: "Replacement model must be available.",
  MODEL_NOT_FOUND: "Model not found.",
};

function toModelDbValues(data: ModelSchema) {
  return {
    ...data,
    inputCostPer1mTokens: Number(data.inputCostPer1mTokens).toFixed(6),
    outputCostPer1mTokens: Number(data.outputCostPer1mTokens).toFixed(6),
  };
}

function getDeleteModelErrorMessage(error: unknown) {
  if (error instanceof Error && DELETE_MODEL_ERROR_MESSAGES[error.message]) {
    return DELETE_MODEL_ERROR_MESSAGES[error.message];
  }

  return "Cannot process your request";
}

export async function getAllModels() {
  try {
    const models = await db.select().from(aiModels);
    return models || [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function addNewModel(data: ModelSchema) {
  try {
    const res = await db.insert(aiModels).values(toModelDbValues(data));

    if (!res) {
      return {
        error: "Failed to create model",
      };
    }

    revalidatePath("/dashboard/model-management");

    return {
      message: "Model created successfully",
    };
  } catch (error) {
    console.error(error);
    return {
      error: "Cannot process your request",
    };
  }
}

export async function getModelDeleteImpact(id: string) {
  try {
    const [connectedAgents, replacementModels] = await Promise.all([
      db
        .select({
          id: agents.id,
          name: agents.name,
          slug: agents.slug,
        })
        .from(agents)
        .where(eq(agents.modelId, id)),
      db
        .select({
          id: aiModels.id,
          name: aiModels.name,
          provider: aiModels.provider,
        })
        .from(aiModels)
        .where(and(ne(aiModels.id, id), eq(aiModels.isAvailable, true))),
    ]);

    return {
      connectedAgents,
      replacementModels,
    } satisfies ModelDeleteImpact;
  } catch (error) {
    console.error(error);
    return {
      error: "Cannot process your request",
    };
  }
}

export async function deleteModel(id: string, replacementModelId?: string) {
  try {
    await db.transaction(async (tx) => {
      const connectedAgents = await tx
        .select({ id: agents.id })
        .from(agents)
        .where(eq(agents.modelId, id));

      if (connectedAgents.length > 0) {
        if (!replacementModelId) {
          throw new Error("MODEL_IN_USE");
        }

        if (replacementModelId === id) {
          throw new Error("INVALID_REPLACEMENT_MODEL");
        }

        const [replacementModel] = await tx
          .select({
            id: aiModels.id,
            isAvailable: aiModels.isAvailable,
          })
          .from(aiModels)
          .where(eq(aiModels.id, replacementModelId))
          .limit(1);

        if (!replacementModel) {
          throw new Error("REPLACEMENT_MODEL_NOT_FOUND");
        }

        if (!replacementModel.isAvailable) {
          throw new Error("REPLACEMENT_MODEL_UNAVAILABLE");
        }

        await tx
          .update(agents)
          .set({ modelId: replacementModelId })
          .where(eq(agents.modelId, id));
      }

      const deleted = await tx
        .delete(aiModels)
        .where(eq(aiModels.id, id))
        .returning({ id: aiModels.id });

      if (deleted.length === 0) {
        throw new Error("MODEL_NOT_FOUND");
      }
    });

    revalidatePath("/dashboard/model-management");

    return {
      message: "Model deleted successfully",
    };
  } catch (error) {
    console.error(error);
    return {
      error: getDeleteModelErrorMessage(error),
    };
  }
}

export async function updateModel(id: string, data: ModelSchema) {
  try {
    await db
      .update(aiModels)
      .set(toModelDbValues(data))
      .where(eq(aiModels.id, id));

    revalidatePath("/dashboard/model-management");

    return {
      message: "Model updated successfully",
    };
  } catch (error) {
    console.error(error);
    return {
      error: "Cannot process your request",
    };
  }
}

export type ModelDetails = typeof aiModels.$inferSelect;
