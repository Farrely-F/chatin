"use server";

import { db } from "@/db";
import { agentUsageLogs, agents, aiModels } from "@/db/schema";
import { and, desc, gte, lte, sql } from "drizzle-orm";

export type MonitoringDateRange = {
  from: Date;
  to: Date;
};

export type MonitoringSummary = {
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  totalCostIdr: number;
  averageCostUsdPerCall: number;
  averageCostIdrPerCall: number;
  uniqueAgents: number;
  uniqueRequestUsers: number;
  cacheHitRate: number;
};

export type ProviderUsageRow = {
  provider: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  costIdr: number;
};

export type DailyUsageRow = {
  day: string;
  calls: number;
  totalTokens: number;
  costUsd: number;
  costIdr: number;
};

export type RecentAgentCallRow = {
  id: string;
  createdAt: Date;
  source: string;
  requestUserId: string | null;
  agentName: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  totalTokens: number;
  costUsd: number;
  costIdr: number;
  cacheHitRate: number;
};

const betweenDates = (range: MonitoringDateRange) =>
  and(
    gte(agentUsageLogs.createdAt, range.from),
    lte(agentUsageLogs.createdAt, range.to),
  );

function normalizeNumber(value: number | null | undefined): number {
  if (!Number.isFinite(value ?? Number.NaN)) {
    return 0;
  }

  return Number(value ?? 0);
}

export async function getMonitoringSummary(
  range: MonitoringDateRange,
): Promise<MonitoringSummary> {
  const [row] = await db
    .select({
      totalCalls: sql<number>`COUNT(*)::int`,
      totalInputTokens: sql<number>`COALESCE(SUM(${agentUsageLogs.inputTokens}), 0)::double precision`,
      totalOutputTokens: sql<number>`COALESCE(SUM(${agentUsageLogs.outputTokens}), 0)::double precision`,
      totalTokens: sql<number>`COALESCE(SUM(${agentUsageLogs.totalTokens}), 0)::double precision`,
      totalCostUsd: sql<number>`COALESCE(SUM(${agentUsageLogs.costUsd}), 0)::double precision`,
      totalCostIdr: sql<number>`COALESCE(SUM(${agentUsageLogs.costIdr}), 0)::double precision`,
      uniqueAgents: sql<number>`COUNT(DISTINCT ${agentUsageLogs.agentId})::int`,
      uniqueRequestUsers: sql<number>`COUNT(DISTINCT ${agentUsageLogs.requestUserId})::int`,
      sumCachedInputTokens: sql<number>`COALESCE(SUM(${agentUsageLogs.cachedInputTokens}), 0)::double precision`,
    })
    .from(agentUsageLogs)
    .where(betweenDates(range));

  const totalCalls = normalizeNumber(row?.totalCalls);
  const totalInputTokens = normalizeNumber(row?.totalInputTokens);
  const totalCostUsd = normalizeNumber(row?.totalCostUsd);
  const totalCostIdr = normalizeNumber(row?.totalCostIdr);

  return {
    totalCalls,
    totalInputTokens,
    totalOutputTokens: normalizeNumber(row?.totalOutputTokens),
    totalTokens: normalizeNumber(row?.totalTokens),
    totalCostUsd,
    totalCostIdr,
    averageCostUsdPerCall: totalCalls > 0 ? totalCostUsd / totalCalls : 0,
    averageCostIdrPerCall: totalCalls > 0 ? totalCostIdr / totalCalls : 0,
    uniqueAgents: normalizeNumber(row?.uniqueAgents),
    uniqueRequestUsers: normalizeNumber(row?.uniqueRequestUsers),
    cacheHitRate:
      totalInputTokens > 0
        ? normalizeNumber(row?.sumCachedInputTokens) / totalInputTokens
        : 0,
  };
}

export async function getProviderUsage(
  range: MonitoringDateRange,
): Promise<ProviderUsageRow[]> {
  const rows = await db
    .select({
      provider: agentUsageLogs.provider,
      calls: sql<number>`COUNT(*)::int`,
      inputTokens: sql<number>`COALESCE(SUM(${agentUsageLogs.inputTokens}), 0)::double precision`,
      outputTokens: sql<number>`COALESCE(SUM(${agentUsageLogs.outputTokens}), 0)::double precision`,
      totalTokens: sql<number>`COALESCE(SUM(${agentUsageLogs.totalTokens}), 0)::double precision`,
      costUsd: sql<number>`COALESCE(SUM(${agentUsageLogs.costUsd}), 0)::double precision`,
      costIdr: sql<number>`COALESCE(SUM(${agentUsageLogs.costIdr}), 0)::double precision`,
    })
    .from(agentUsageLogs)
    .where(betweenDates(range))
    .groupBy(agentUsageLogs.provider)
    .orderBy(sql`COALESCE(SUM(${agentUsageLogs.costUsd}), 0) DESC`);

  return rows.map((row) => ({
    provider: row.provider,
    calls: normalizeNumber(row.calls),
    inputTokens: normalizeNumber(row.inputTokens),
    outputTokens: normalizeNumber(row.outputTokens),
    totalTokens: normalizeNumber(row.totalTokens),
    costUsd: normalizeNumber(row.costUsd),
    costIdr: normalizeNumber(row.costIdr),
  }));
}

export async function getDailyUsageTrend(
  range: MonitoringDateRange,
): Promise<DailyUsageRow[]> {
  const rows = await db
    .select({
      day: sql<string>`TO_CHAR(DATE_TRUNC('day', ${agentUsageLogs.createdAt}), 'YYYY-MM-DD')`,
      calls: sql<number>`COUNT(*)::int`,
      totalTokens: sql<number>`COALESCE(SUM(${agentUsageLogs.totalTokens}), 0)::double precision`,
      costUsd: sql<number>`COALESCE(SUM(${agentUsageLogs.costUsd}), 0)::double precision`,
      costIdr: sql<number>`COALESCE(SUM(${agentUsageLogs.costIdr}), 0)::double precision`,
    })
    .from(agentUsageLogs)
    .where(betweenDates(range))
    .groupBy(sql`DATE_TRUNC('day', ${agentUsageLogs.createdAt})`)
    .orderBy(sql`DATE_TRUNC('day', ${agentUsageLogs.createdAt}) ASC`);

  return rows.map((row) => ({
    day: row.day,
    calls: normalizeNumber(row.calls),
    totalTokens: normalizeNumber(row.totalTokens),
    costUsd: normalizeNumber(row.costUsd),
    costIdr: normalizeNumber(row.costIdr),
  }));
}

export async function getRecentAgentCalls(
  range: MonitoringDateRange,
): Promise<RecentAgentCallRow[]> {
  const rows = await db
    .select({
      id: agentUsageLogs.id,
      createdAt: agentUsageLogs.createdAt,
      source: agentUsageLogs.source,
      requestUserId: agentUsageLogs.requestUserId,
      agentName: agents.name,
      provider: agentUsageLogs.provider,
      model: aiModels.name,
      inputTokens: agentUsageLogs.inputTokens,
      outputTokens: agentUsageLogs.outputTokens,
      cachedInputTokens: agentUsageLogs.cachedInputTokens,
      totalTokens: agentUsageLogs.totalTokens,
      costUsd: sql<number>`${agentUsageLogs.costUsd}::double precision`,
      costIdr: sql<number>`${agentUsageLogs.costIdr}::double precision`,
    })
    .from(agentUsageLogs)
    .leftJoin(agents, sql`${agentUsageLogs.agentId} = ${agents.id}`)
    .leftJoin(aiModels, sql`${agentUsageLogs.modelId} = ${aiModels.id}`)
    .where(betweenDates(range))
    .orderBy(desc(agentUsageLogs.createdAt))
    .limit(50);

  return rows.map((row) => {
    const inputTokens = normalizeNumber(row.inputTokens);
    const cachedInputTokens = normalizeNumber(row.cachedInputTokens);

    return {
      id: row.id,
      createdAt: row.createdAt,
      source: row.source,
      requestUserId: row.requestUserId,
      agentName: row.agentName ?? "Unknown Agent",
      provider: row.provider,
      model: row.model ?? "Unknown Model",
      inputTokens,
      outputTokens: normalizeNumber(row.outputTokens),
      cachedInputTokens,
      totalTokens: normalizeNumber(row.totalTokens),
      costUsd: normalizeNumber(row.costUsd),
      costIdr: normalizeNumber(row.costIdr),
      cacheHitRate: inputTokens > 0 ? cachedInputTokens / inputTokens : 0,
    };
  });
}

export async function getAgentUsageMonitoring(range: MonitoringDateRange) {
  const [summary, providerUsage, dailyUsageTrend, recentCalls] =
    await Promise.all([
      getMonitoringSummary(range),
      getProviderUsage(range),
      getDailyUsageTrend(range),
      getRecentAgentCalls(range),
    ]);

  return {
    summary,
    providerUsage,
    dailyUsageTrend,
    recentCalls,
  };
}
