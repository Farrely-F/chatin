"use server";

import { db } from "@/db";
import { agents } from "@/db/schema/agents";
import { AgentFormValues } from "@/schema/agent-schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getAllAgents(userId: string) {
  const res = await db.select().from(agents).where(eq(agents.userId, userId));
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

export async function createNewAgent(data: AgentFormValues, userId: string) {
  const res = await db.insert(agents).values({
    ...data,
    userId: userId,
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
    await db
      .update(agents)
      .set({
        ...data,
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
