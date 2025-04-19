"use server";

import { db } from "@/db";
import { aiModels } from "@/db/schema";
import { ModelSchema } from "@/schema/model-schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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
  console.log(data);

  try {
    const res = await db.insert(aiModels).values({ ...data });

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

export async function deleteModel(id: string) {
  try {
    await db.delete(aiModels).where(eq(aiModels.id, id));

    revalidatePath("/dashboard/model-management");

    return {
      message: "Model deleted successfully",
    };
  } catch (error) {
    console.error(error);
    return {
      error: "Cannot process your request",
    };
  }
}

export async function updateModel(id: string, data: ModelSchema) {
  try {
    await db
      .update(aiModels)
      .set({ ...data })
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
