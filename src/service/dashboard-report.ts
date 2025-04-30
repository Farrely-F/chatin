import { db } from "@/db";
import { agents, aiModels } from "@/db/schema";
import { count, desc, eq } from "drizzle-orm";

export async function getCreatedAgentCount(userId: string) {
  try {
    const [res] = await db
      .select({ count: count() })
      .from(agents)
      .where(eq(agents.userId, userId));
    return res;
  } catch {
    return { count: 0 };
  }
}

export async function getMostUsedModel(userId: string) {
  const modelCount = count(agents.modelId);

  const [res] = await db
    .select({
      modelId: agents.modelId,
      modelCount,
      modelProvider: aiModels.provider,
    })
    .from(agents)
    .where(eq(agents.userId, userId))
    .leftJoin(aiModels, eq(agents.modelId, aiModels.id))
    .groupBy(agents.modelId, aiModels.provider)
    .orderBy(desc(modelCount))
    .limit(1);

  return res ?? null;
}

export async function getUserStatistics(userId: string) {
  if (!userId) {
    return;
  }

  const [totalAgents, mostUsedModel] = await Promise.all([
    getCreatedAgentCount(userId),
    getMostUsedModel(userId),
  ]);

  return {
    totalAgents: totalAgents.count,
    mostUsedModel,
  };
}
