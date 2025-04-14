"use server";

import { db } from "@/db";
import { personas } from "@/db/schema";
import { CreatePersonaSchema } from "@/schema/persona-schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getAllPersonas(userId: string) {
  const res = await db
    .select()
    .from(personas)
    .where(eq(personas.userId, userId));
  return res ?? [];
}

export async function getPersonaById(id: string, userId: string) {
  try {
    const [res] = await db
      .select()
      .from(personas)
      .where(and(eq(personas.userId, userId), eq(personas.id, id)))
      .limit(1);

    if (!res) {
      return {
        error: "Agent not found",
      };
    }

    return res;
  } catch (error) {
    console.error(error);
    return {
      error: "Error fetching agent",
    };
  }
}

export async function createAgentPersona(
  userId: string,
  data: CreatePersonaSchema,
) {
  const res = await db.insert(personas).values({ ...data, userId: userId });

  if (!res) {
    return {
      error: "Failed to create persona",
    };
  }

  revalidatePath("/dashboard/personas");
  revalidatePath("/dashboard/agents");

  return {
    message: "Persona created succesfully",
  };
}

export async function deletePersona(userId: string, personaId: string) {
  try {
    await db
      .delete(personas)
      .where(and(eq(personas.userId, userId), eq(personas.id, personaId)));

    revalidatePath("/dashboard/agents");

    return {
      message: "Persona deleted succesfully",
    };
  } catch (error) {
    console.error(error);
    return {
      error: "Cannot process your request",
    };
  }
}

export type PersonaDetails = typeof personas.$inferSelect;
