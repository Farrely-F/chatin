"use server";

import { db } from "@/db";
import { agents } from "@/db/schema/agents";
import { users } from "@/db/schema/users";
import { hasPermission, hasScopedPermission } from "@/lib/check-permission";
import { slugify } from "@/lib/utils";
import { AgentFormValues } from "@/schema/agent-schema";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  getPrimaryOrganizationForUser,
  isOrganizationMember,
} from "./organizations";

function withAgentScope(userId: string, organizationId?: string) {
  if (organizationId) {
    return or(
      eq(agents.organizationId, organizationId),
      and(isNull(agents.organizationId), eq(agents.userId, userId)),
    );
  }

  return eq(agents.userId, userId);
}

function resolveAgentSlug(data: AgentFormValues) {
  return slugify(data.slug || data.name);
}

async function validateOrganizationAssignment(
  userId: string,
  organizationId?: string,
) {
  if (!organizationId) {
    return { organizationId: null };
  }

  const isMember = await isOrganizationMember(userId, organizationId);

  if (!isMember) {
    return { error: "You are not a member of the selected organization" };
  }

  return { organizationId };
}

export async function checkAgentSlugAvailability(
  userId: string,
  slug: string,
  currentAgentId?: string,
) {
  if (!userId) {
    return { error: "Unauthorized" };
  }

  const normalizedSlug = slugify(slug);

  if (!normalizedSlug) {
    return { error: "Invalid slug" };
  }

  const [existing] = await db
    .select({ id: agents.id })
    .from(agents)
    .where(eq(agents.slug, normalizedSlug))
    .limit(1);

  const isAvailable = !existing || existing.id === currentAgentId;

  return {
    slug: normalizedSlug,
    isAvailable,
    message: isAvailable ? "Slug is available" : "Slug is already in use",
  };
}

export async function getAllAgents(userId: string) {
  if (!userId) {
    return;
  }

  const organization = await getPrimaryOrganizationForUser(userId);

  const res = await db
    .select()
    .from(agents)
    .where(withAgentScope(userId, organization?.id));
  return res;
}

export async function getAllAgentWithModel(userId: string) {
  if (!userId) {
    return;
  }

  const organization = await getPrimaryOrganizationForUser(userId);

  const res = await db.query.agents.findMany({
    where: (agents, { eq, and, isNull, or }) =>
      organization?.id
        ? or(
            eq(agents.organizationId, organization.id),
            and(isNull(agents.organizationId), eq(agents.userId, userId)),
          )
        : and(eq(agents.userId, userId)),
    with: {
      model: true,
    },
  });
  return res;
}

export async function getAllAgentsByUserId(userId: string) {
  if (!userId) {
    return;
  }

  const organization = await getPrimaryOrganizationForUser(userId);

  const res = await db
    .select({
      id: agents.id,
      name: agents.name,
      description: agents.description,
    })
    .from(agents)
    .where(withAgentScope(userId, organization?.id));
  return res;
}

export async function getDeployedAgents(userId?: string) {
  const organization = userId
    ? await getPrimaryOrganizationForUser(userId)
    : undefined;

  const res = await db
    .select({
      id: agents.id,
      name: agents.name,
      description: agents.description,
      slug: agents.slug,
    })
    .from(agents)
    .where(
      userId
        ? and(
            eq(agents.status, "active"),
            withAgentScope(userId, organization?.id),
          )
        : eq(agents.status, "active"),
    );
  return res || [];
}

export async function getPublicDeployedAgents(userId?: string) {
  const organization = userId
    ? await getPrimaryOrganizationForUser(userId)
    : undefined;

  const res = await db
    .select({
      id: agents.id,
      name: agents.name,
      description: agents.description,
      slug: agents.slug,
      status: agents.status,
      createdAt: agents.createdAt,
      ownerId: users.id,
      ownerName: users.name,
      ownerEmail: users.email,
    })
    .from(agents)
    .innerJoin(users, eq(agents.userId, users.id))
    .where(
      userId
        ? and(
            eq(agents.status, "active"),
            withAgentScope(userId, organization?.id),
          )
        : eq(agents.status, "active"),
    )
    .orderBy(desc(agents.createdAt));

  return res || [];
}

export async function getOrganizationPublicDeployedAgents(userId: string) {
  if (!userId) {
    return [];
  }

  const organization = await getPrimaryOrganizationForUser(userId);

  if (!organization?.id) {
    return [];
  }

  const res = await db
    .select({
      id: agents.id,
      name: agents.name,
      description: agents.description,
      slug: agents.slug,
      status: agents.status,
      createdAt: agents.createdAt,
      ownerId: users.id,
      ownerName: users.name,
      ownerEmail: users.email,
    })
    .from(agents)
    .innerJoin(users, eq(agents.userId, users.id))
    .where(
      and(
        eq(agents.status, "active"),
        eq(agents.organizationId, organization.id),
      ),
    )
    .orderBy(desc(agents.createdAt));

  return res || [];
}

export async function getAgentById(id: string, userId: string) {
  try {
    const organization = await getPrimaryOrganizationForUser(userId);

    const [res] = await db
      .select()
      .from(agents)
      .where(and(withAgentScope(userId, organization?.id), eq(agents.id, id)))
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

export async function getAgentBySlug(slug: string) {
  try {
    const [res] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.slug, slug), eq(agents.status, "active")))
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

export async function getAgentBySlugForUser(slug: string, userId: string) {
  try {
    const organization = await getPrimaryOrganizationForUser(userId);

    const [res] = await db
      .select()
      .from(agents)
      .where(
        and(
          eq(agents.slug, slug),
          eq(agents.status, "active"),
          organization?.id
            ? eq(agents.organizationId, organization.id)
            : eq(agents.userId, userId),
        ),
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

export async function createNewAgent(data: AgentFormValues, userId: string) {
  const organization = await getPrimaryOrganizationForUser(userId);
  const slug = resolveAgentSlug(data);

  const organizationValidation = await validateOrganizationAssignment(
    userId,
    data.organizationId,
  );

  if ("error" in organizationValidation) {
    return {
      error: organizationValidation.error,
    };
  }

  const isSlugAvailable = await db
    .select({ slug: agents.slug })
    .from(agents)
    .where(eq(agents.slug, slug));

  if (isSlugAvailable.length > 0) {
    return {
      error: "Slug already exists",
    };
  }

  const res = await db.insert(agents).values({
    ...data,
    userId: userId,
    organizationId: organizationValidation.organizationId ?? organization?.id,
    slug: slug,
  });

  if (!res) {
    return {
      error: "Failed to create agent",
    };
  }

  revalidatePath("/dashboard/agents");

  return {
    message: "Agent created successfully",
  };
}

export async function updateAgentById(
  agentId: string,
  userId: string,
  data: AgentFormValues,
) {
  try {
    const organization = await getPrimaryOrganizationForUser(userId);
    const personaId = data.personaId ? data.personaId : null;
    const slug = resolveAgentSlug(data);

    const existingSlug = await db
      .select({ id: agents.id })
      .from(agents)
      .where(eq(agents.slug, slug))
      .limit(1);

    if (existingSlug[0] && existingSlug[0].id !== agentId) {
      return {
        error: "Slug already exists",
      };
    }

    const organizationValidation = await validateOrganizationAssignment(
      userId,
      data.organizationId,
    );

    if ("error" in organizationValidation) {
      return {
        error: organizationValidation.error,
      };
    }

    await db
      .update(agents)
      .set({
        ...data,
        personaId,
        slug,
        organizationId: organizationValidation.organizationId,
      })
      .where(
        and(withAgentScope(userId, organization?.id), eq(agents.id, agentId)),
      );

    revalidatePath(`/dashboard/agents/${agentId}`);

    return {
      message: "Successfully updated the agent",
    };
  } catch (error) {
    console.error(error);
    return {
      error: "Cannot process your request",
    };
  }
}

export async function deleteAgentById(agentId: string, userId: string) {
  try {
    const agent = await getAgentWithKnowledgeBase(agentId, userId);

    if ("error" in agent) {
      return {
        error: agent.error,
      };
    }

    if (agent.knowledgeBases.length > 0) {
      return {
        error: "You cannot delete an agent with knowledge bases",
      };
    }

    const organization = await getPrimaryOrganizationForUser(userId);

    await db
      .delete(agents)
      .where(
        and(withAgentScope(userId, organization?.id), eq(agents.id, agentId)),
      );

    revalidatePath("/dashboard/agents");

    return {
      message: "Succesfully delete the agent",
    };
  } catch (error) {
    console.error(error);
    return {
      error: "Cannot process your request",
    };
  }
}

export async function getAgentWithKnowledgeBase(
  agentId: string,
  userId: string,
) {
  try {
    const organization = await getPrimaryOrganizationForUser(userId);

    const agent = await db.query.agents.findFirst({
      where: (agents, { eq, and, isNull, or }) =>
        and(
          eq(agents.id, agentId),
          organization?.id
            ? or(
                eq(agents.organizationId, organization.id),
                and(isNull(agents.organizationId), eq(agents.userId, userId)),
              )
            : eq(agents.userId, userId),
        ),
      with: {
        knowledgeBases: true,
        personas: true,
        model: true,
      },
    });

    if (!agent) {
      return { error: "Agent not found" };
    }

    return agent;
  } catch (error) {
    console.error("Error fetching agent with knowledge base:", error);
    return { error: "Error fetching data" };
  }
}

export async function changeAgentStatus(
  agentId: string,
  userId: string,
  currentStatus: "active" | "archived",
) {
  const status = currentStatus === "active" ? "archived" : "active";

  try {
    const organization = await getPrimaryOrganizationForUser(userId);

    const [agent] = await db
      .select({ organizationId: agents.organizationId })
      .from(agents)
      .where(
        and(withAgentScope(userId, organization?.id), eq(agents.id, agentId)),
      )
      .limit(1);

    if (!agent) {
      return {
        error: "Agent not found",
      };
    }

    const updatePayload: Partial<typeof agents.$inferInsert> = { status };

    if (status === "active" && organization?.id && !agent.organizationId) {
      updatePayload.organizationId = organization.id;
    }

    await db
      .update(agents)
      .set(updatePayload)
      .where(
        and(withAgentScope(userId, organization?.id), eq(agents.id, agentId)),
      );

    revalidatePath(`/dashboard/agents/${agentId}`);

    return {
      message: "Successfully updated the agent status",
    };
  } catch (error) {
    console.error(error);
    return {
      error: "Cannot process your request",
    };
  }
}

export async function forceArchiveAgent(agentId: string, adminUserId: string) {
  if (!adminUserId) {
    return { error: "Unauthorized" };
  }

  const isSystemAdmin = await hasPermission(adminUserId, "system.read");
  const organization = await getPrimaryOrganizationForUser(adminUserId);
  const hasOrgManageAccess = organization?.id
    ? await hasScopedPermission(
        adminUserId,
        "organization.manage",
        organization.id,
      )
    : false;

  if (!isSystemAdmin && !hasOrgManageAccess) {
    return { error: "Unauthorized" };
  }

  const [agent] = await db
    .select({ slug: agents.slug, organizationId: agents.organizationId })
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  if (!agent) {
    return { error: "Agent not found" };
  }

  if (
    !isSystemAdmin &&
    (!organization?.id || agent.organizationId !== organization.id)
  ) {
    return { error: "Unauthorized" };
  }

  try {
    await db
      .update(agents)
      .set({ status: "archived" })
      .where(eq(agents.id, agentId));

    revalidatePath("/dashboard/monitoring/deployed-agents");
    revalidatePath("/dashboard/monitoring/organization/deployed-agents");
    revalidatePath("/dashboard/monitoring/organization");
    revalidatePath("/dashboard/agents");
    if (agent.slug) {
      revalidatePath(`/chat/${agent.slug}`);
    }

    return { message: "Agent archived successfully" };
  } catch (error) {
    console.error(error);
    return { error: "Cannot process your request" };
  }
}

export async function getDeployedAgentBySlug(slug: string) {
  try {
    const agent = await db.query.agents.findFirst({
      where: (agents, { eq, and }) =>
        and(eq(agents.slug, slug), eq(agents.status, "active")),
      with: {
        knowledgeBases: true,
        personas: true,
        model: true,
      },
    });

    if (!agent) {
      return { error: "Agent not found" };
    }

    return agent;
  } catch (error) {
    console.error("Error fetching agent with knowledge base:", error);
    return { error: "Error fetching data" };
  }
}

export type AgentDetails = typeof agents.$inferSelect;
export type AgentWithKnowledgeBase = Awaited<
  ReturnType<typeof getAgentWithKnowledgeBase>
>;
export type PublicDeployedAgent = Awaited<
  ReturnType<typeof getPublicDeployedAgents>
>[number];
