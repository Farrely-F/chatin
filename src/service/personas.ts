"use server";

import { db } from "@/db";
import { agents, personas } from "@/db/schema";
import { CreatePersonaSchema } from "@/schema/persona-schema";
import { and, eq, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getPrimaryOrganizationForUser } from "./organizations";

function withPersonaScope(userId: string, organizationId?: string) {
  if (organizationId) {
    return or(
      eq(personas.organizationId, organizationId),
      and(isNull(personas.organizationId), eq(personas.userId, userId)),
    );
  }

  return eq(personas.userId, userId);
}

export async function getAllPersonas(userId: string) {
  const organization = await getPrimaryOrganizationForUser(userId);

  const res = await db
    .select()
    .from(personas)
    .where(withPersonaScope(userId, organization?.id));
  return res ?? [];
}

export async function getPersonaById(id: string, userId: string) {
  try {
    const organization = await getPrimaryOrganizationForUser(userId);

    const [res] = await db
      .select()
      .from(personas)
      .where(
        and(withPersonaScope(userId, organization?.id), eq(personas.id, id)),
      )
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
  const organization = await getPrimaryOrganizationForUser(userId);
  const res = await db.insert(personas).values({
    ...data,
    userId: userId,
    organizationId: organization?.id,
  });

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

export async function editAgentPersona(
  personaId: string,
  userId: string,
  data: CreatePersonaSchema,
) {
  try {
    const organization = await getPrimaryOrganizationForUser(userId);

    await db
      .update(personas)
      .set({ ...data })
      .where(
        and(
          eq(personas.id, personaId),
          withPersonaScope(userId, organization?.id),
        ),
      );

    revalidatePath(`/dashboard/personas/${personaId}`);
    revalidatePath("/dashboard/agents");

    return {
      message: "Successfully updated the persona",
    };
  } catch (error) {
    console.error(error);
    return {
      error: "Cannot process your request",
    };
  }
}

export async function deletePersona(userId: string, personaId: string) {
  try {
    const organization = await getPrimaryOrganizationForUser(userId);

    await db
      .delete(personas)
      .where(
        and(
          withPersonaScope(userId, organization?.id),
          eq(personas.id, personaId),
        ),
      );

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

export async function allAgentByPersonaId(userId: string, personaId: string) {
  const organization = await getPrimaryOrganizationForUser(userId);

  const res = await db
    .select()
    .from(agents)
    .where(
      and(
        eq(agents.personaId, personaId),
        organization?.id
          ? or(
              eq(agents.organizationId, organization.id),
              and(isNull(agents.organizationId), eq(agents.userId, userId)),
            )
          : eq(agents.userId, userId),
      ),
    );

  return res || [];
}

export type PersonaDetails = typeof personas.$inferSelect;
