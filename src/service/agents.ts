"use server";

import { db } from "@/db";
import { agents } from "@/db/schema/agents";
import { slugify } from "@/lib/utils";
import { AgentFormValues } from "@/schema/agent-schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getAllAgents(userId: string) {
  if (!userId) {
    return;
  }

  const res = await db.select().from(agents).where(eq(agents.userId, userId));
  return res;
}

export async function getAllAgentWithModel(userId: string) {
  if (!userId) {
    return;
  }

  const res = await db.query.agents.findMany({
    where: (agents, { eq, and }) => and(eq(agents.userId, userId)),
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

  const res = await db
    .select({
      id: agents.id,
      name: agents.name,
      description: agents.description,
    })
    .from(agents)
    .where(eq(agents.userId, userId));
  return res;
}

export async function getAgentById(id: string, userId: string) {
  try {
    const [res] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.userId, userId), eq(agents.id, id)))
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

export async function createNewAgent(data: AgentFormValues, userId: string) {
  const slug = slugify(data.name);

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
    const personaId = data.personaId ? data.personaId : null;

    await db
      .update(agents)
      .set({
        ...data,
        personaId,
      })
      .where(and(eq(agents.userId, userId), eq(agents.id, agentId)));

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

    await db
      .delete(agents)
      .where(and(eq(agents.userId, userId), eq(agents.id, agentId)));

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
    const agent = await db.query.agents.findFirst({
      where: (agents, { eq, and }) =>
        and(eq(agents.id, agentId), eq(agents.userId, userId)),
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
    await db
      .update(agents)
      .set({ status })
      .where(and(eq(agents.userId, userId), eq(agents.id, agentId)));

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
