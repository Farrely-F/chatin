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
  errorRate: number;
  averageLatencyMs: number;
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

export type SourceVolumeRow = {
  source: string;
  calls: number;
};

export type HourlyUsageRow = {
  hour: number;
  calls: number;
};

export type AgentEfficiencyRow = {
  agentId: string;
  agentName: string;
  calls: number;
  cacheHitRate: number;
  outputRatio: number;
  avgTokensPerReq: number;
  p95Tokens: number;
  p99Tokens: number;
  totalCostUsd: number;
  averageCostUsdPerReq: number;
  costPer1kTokensUsd: number;
};

export type ProviderModelComparisonRow = {
  provider: string;
  modelId: string;
  model: string;
  requests: number;
  avgTokens: number;
  avgCostUsd: number;
  totalCostUsd: number;
};

export type TopUserSpendRow = {
  requestUserId: string;
  spendUsd: number;
  spendIdr: number;
  requests: number;
  totalTokens: number;
};

export type FxRateDrift = {
  baselineFx: number;
  averageFx: number;
  minFx: number;
  maxFx: number;
  deviationRate: number;
  exceedsThreshold: boolean;
};

export type AnomalySignals = {
  totalCalls: number;
  tokenP99: number;
  highTokenCallCount: number;
  highCostCallCount: number;
  zeroCacheCallCount: number;
  highOutputRatioCallCount: number;
  peakRequestsPerMinute: number;
  avgRequestsPerMinute: number;
  requestsPerMinuteSpikeRatio: number;
  rpmSpikeDetected: boolean;
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

function normalizeText(
  value: string | null | undefined,
  fallback: string,
): string {
  const normalized = value?.trim();
  return normalized?.length ? normalized : fallback;
}

function normalizeThreshold(
  value: number | undefined,
  fallback: number,
): number {
  if (Number.isFinite(value) && (value ?? 0) > 0) {
    return Number(value);
  }

  return fallback;
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
      errorCalls: sql<number>`COALESCE(SUM(CASE WHEN ${agentUsageLogs.isError} THEN 1 ELSE 0 END), 0)::int`,
      averageLatencyMs: sql<number>`COALESCE(AVG(${agentUsageLogs.latencyMs}), 0)::double precision`,
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
    errorRate:
      totalCalls > 0 ? normalizeNumber(row?.errorCalls) / totalCalls : 0,
    averageLatencyMs: normalizeNumber(row?.averageLatencyMs),
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

export async function getSourceVolume(
  range: MonitoringDateRange,
): Promise<SourceVolumeRow[]> {
  const rows = await db
    .select({
      source: agentUsageLogs.source,
      calls: sql<number>`COUNT(*)::int`,
    })
    .from(agentUsageLogs)
    .where(betweenDates(range))
    .groupBy(agentUsageLogs.source)
    .orderBy(sql`COUNT(*) DESC`);

  return rows.map((row) => ({
    source: normalizeText(row.source, "unknown"),
    calls: normalizeNumber(row.calls),
  }));
}

export async function getHourlyUsageDistribution(
  range: MonitoringDateRange,
): Promise<HourlyUsageRow[]> {
  const rows = await db
    .select({
      hour: sql<number>`EXTRACT(HOUR FROM ${agentUsageLogs.createdAt})::int`,
      calls: sql<number>`COUNT(*)::int`,
    })
    .from(agentUsageLogs)
    .where(betweenDates(range))
    .groupBy(sql`EXTRACT(HOUR FROM ${agentUsageLogs.createdAt})`)
    .orderBy(sql`EXTRACT(HOUR FROM ${agentUsageLogs.createdAt}) ASC`);

  const callsByHour = new Map<number, number>();

  rows.forEach((row) => {
    callsByHour.set(normalizeNumber(row.hour), normalizeNumber(row.calls));
  });

  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    calls: callsByHour.get(hour) ?? 0,
  }));
}

export async function getAgentEfficiency(
  range: MonitoringDateRange,
): Promise<AgentEfficiencyRow[]> {
  const rows = await db
    .select({
      agentId: agentUsageLogs.agentId,
      agentName: agents.name,
      calls: sql<number>`COUNT(*)::int`,
      cacheHitRate: sql<number>`COALESCE(AVG(${agentUsageLogs.cachedInputTokens}::double precision / NULLIF(${agentUsageLogs.inputTokens}, 0)), 0)::double precision`,
      outputRatio: sql<number>`COALESCE(AVG(${agentUsageLogs.outputTokens}::double precision / NULLIF(${agentUsageLogs.inputTokens}, 0)), 0)::double precision`,
      avgTokensPerReq: sql<number>`COALESCE(AVG(${agentUsageLogs.totalTokens}), 0)::double precision`,
      p95Tokens: sql<number>`COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ${agentUsageLogs.totalTokens}), 0)::double precision`,
      p99Tokens: sql<number>`COALESCE(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY ${agentUsageLogs.totalTokens}), 0)::double precision`,
      totalCostUsd: sql<number>`COALESCE(SUM(${agentUsageLogs.costUsd}), 0)::double precision`,
      averageCostUsdPerReq: sql<number>`COALESCE(AVG(${agentUsageLogs.costUsd}), 0)::double precision`,
      costPer1kTokensUsd: sql<number>`COALESCE(SUM(${agentUsageLogs.costUsd}) / NULLIF(SUM(${agentUsageLogs.totalTokens}), 0) * 1000, 0)::double precision`,
    })
    .from(agentUsageLogs)
    .leftJoin(agents, sql`${agentUsageLogs.agentId} = ${agents.id}`)
    .where(betweenDates(range))
    .groupBy(agentUsageLogs.agentId, agents.name)
    .orderBy(sql`COALESCE(SUM(${agentUsageLogs.costUsd}), 0) DESC`);

  return rows.map((row) => ({
    agentId: row.agentId,
    agentName: normalizeText(row.agentName, "Unknown Agent"),
    calls: normalizeNumber(row.calls),
    cacheHitRate: normalizeNumber(row.cacheHitRate),
    outputRatio: normalizeNumber(row.outputRatio),
    avgTokensPerReq: normalizeNumber(row.avgTokensPerReq),
    p95Tokens: normalizeNumber(row.p95Tokens),
    p99Tokens: normalizeNumber(row.p99Tokens),
    totalCostUsd: normalizeNumber(row.totalCostUsd),
    averageCostUsdPerReq: normalizeNumber(row.averageCostUsdPerReq),
    costPer1kTokensUsd: normalizeNumber(row.costPer1kTokensUsd),
  }));
}

export async function getProviderModelComparison(
  range: MonitoringDateRange,
): Promise<ProviderModelComparisonRow[]> {
  const rows = await db
    .select({
      provider: agentUsageLogs.provider,
      modelId: agentUsageLogs.modelId,
      model: aiModels.name,
      requests: sql<number>`COUNT(*)::int`,
      avgTokens: sql<number>`COALESCE(AVG(${agentUsageLogs.totalTokens}), 0)::double precision`,
      avgCostUsd: sql<number>`COALESCE(AVG(${agentUsageLogs.costUsd}), 0)::double precision`,
      totalCostUsd: sql<number>`COALESCE(SUM(${agentUsageLogs.costUsd}), 0)::double precision`,
    })
    .from(agentUsageLogs)
    .leftJoin(aiModels, sql`${agentUsageLogs.modelId} = ${aiModels.id}`)
    .where(betweenDates(range))
    .groupBy(agentUsageLogs.provider, agentUsageLogs.modelId, aiModels.name)
    .orderBy(sql`COALESCE(SUM(${agentUsageLogs.costUsd}), 0) DESC`);

  return rows.map((row) => ({
    provider: normalizeText(row.provider, "unknown"),
    modelId: row.modelId,
    model: normalizeText(row.model, "Unknown Model"),
    requests: normalizeNumber(row.requests),
    avgTokens: normalizeNumber(row.avgTokens),
    avgCostUsd: normalizeNumber(row.avgCostUsd),
    totalCostUsd: normalizeNumber(row.totalCostUsd),
  }));
}

export async function getTopUsersBySpend(
  range: MonitoringDateRange,
): Promise<TopUserSpendRow[]> {
  const rows = await db
    .select({
      requestUserId: agentUsageLogs.requestUserId,
      spendUsd: sql<number>`COALESCE(SUM(${agentUsageLogs.costUsd}), 0)::double precision`,
      spendIdr: sql<number>`COALESCE(SUM(${agentUsageLogs.costIdr}), 0)::double precision`,
      requests: sql<number>`COUNT(*)::int`,
      totalTokens: sql<number>`COALESCE(SUM(${agentUsageLogs.totalTokens}), 0)::double precision`,
    })
    .from(agentUsageLogs)
    .where(
      and(
        betweenDates(range),
        sql`${agentUsageLogs.requestUserId} IS NOT NULL`,
      ),
    )
    .groupBy(agentUsageLogs.requestUserId)
    .orderBy(sql`COALESCE(SUM(${agentUsageLogs.costUsd}), 0) DESC`)
    .limit(10);

  return rows
    .filter((row) => Boolean(row.requestUserId))
    .map((row) => ({
      requestUserId: row.requestUserId as string,
      spendUsd: normalizeNumber(row.spendUsd),
      spendIdr: normalizeNumber(row.spendIdr),
      requests: normalizeNumber(row.requests),
      totalTokens: normalizeNumber(row.totalTokens),
    }));
}

export async function getFxRateDrift(
  range: MonitoringDateRange,
): Promise<FxRateDrift> {
  const [row] = await db
    .select({
      averageFx: sql<number>`COALESCE(AVG(${agentUsageLogs.fxUsdToIdr}), 0)::double precision`,
      minFx: sql<number>`COALESCE(MIN(${agentUsageLogs.fxUsdToIdr}), 0)::double precision`,
      maxFx: sql<number>`COALESCE(MAX(${agentUsageLogs.fxUsdToIdr}), 0)::double precision`,
    })
    .from(agentUsageLogs)
    .where(betweenDates(range));

  const baselineFx = normalizeThreshold(
    Number(process.env.USD_IDR_FALLBACK),
    16000,
  );
  const averageFx = normalizeNumber(row?.averageFx);
  const minFx = normalizeNumber(row?.minFx);
  const maxFx = normalizeNumber(row?.maxFx);
  const deviationRate =
    baselineFx > 0 ? Math.abs(averageFx - baselineFx) / baselineFx : 0;

  return {
    baselineFx,
    averageFx,
    minFx,
    maxFx,
    deviationRate,
    exceedsThreshold: deviationRate > 0.05,
  };
}

export async function getAnomalySignals(
  range: MonitoringDateRange,
): Promise<AnomalySignals> {
  const highCostThresholdUsd = normalizeThreshold(
    Number(process.env.MONITORING_HIGH_COST_USD),
    1,
  );
  const highOutputRatioThreshold = normalizeThreshold(
    Number(process.env.MONITORING_OUTPUT_RATIO_THRESHOLD),
    5,
  );

  const [p99Row] = await db
    .select({
      tokenP99: sql<number>`COALESCE(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY ${agentUsageLogs.totalTokens}), 0)::double precision`,
      totalCalls: sql<number>`COUNT(*)::int`,
    })
    .from(agentUsageLogs)
    .where(betweenDates(range));

  const tokenP99 = normalizeNumber(p99Row?.tokenP99);
  const tokenAnomalyThreshold = Math.ceil(tokenP99);

  const [signalRow] = await db
    .select({
      highTokenCallCount: sql<number>`COALESCE(SUM(CASE WHEN ${agentUsageLogs.totalTokens} > ${tokenAnomalyThreshold} THEN 1 ELSE 0 END), 0)::int`,
      highCostCallCount: sql<number>`COALESCE(SUM(CASE WHEN ${agentUsageLogs.costUsd} > ${highCostThresholdUsd} THEN 1 ELSE 0 END), 0)::int`,
      zeroCacheCallCount: sql<number>`COALESCE(SUM(CASE WHEN ${agentUsageLogs.inputTokens} > 0 AND ${agentUsageLogs.cachedInputTokens} = 0 THEN 1 ELSE 0 END), 0)::int`,
      highOutputRatioCallCount: sql<number>`COALESCE(SUM(CASE WHEN ${agentUsageLogs.inputTokens} > 0 AND ${agentUsageLogs.outputTokens}::double precision / ${agentUsageLogs.inputTokens} > ${highOutputRatioThreshold} THEN 1 ELSE 0 END), 0)::int`,
    })
    .from(agentUsageLogs)
    .where(betweenDates(range));

  const perMinuteRows = await db
    .select({
      calls: sql<number>`COUNT(*)::int`,
    })
    .from(agentUsageLogs)
    .where(betweenDates(range))
    .groupBy(sql`DATE_TRUNC('minute', ${agentUsageLogs.createdAt})`);

  const minuteBuckets = perMinuteRows.map((row) => normalizeNumber(row.calls));
  const peakRequestsPerMinute =
    minuteBuckets.length > 0 ? Math.max(...minuteBuckets) : 0;
  const avgRequestsPerMinute =
    minuteBuckets.length > 0
      ? minuteBuckets.reduce((sum, value) => sum + value, 0) /
        minuteBuckets.length
      : 0;
  const requestsPerMinuteSpikeRatio =
    avgRequestsPerMinute > 0 ? peakRequestsPerMinute / avgRequestsPerMinute : 0;

  return {
    totalCalls: normalizeNumber(p99Row?.totalCalls),
    tokenP99,
    highTokenCallCount: normalizeNumber(signalRow?.highTokenCallCount),
    highCostCallCount: normalizeNumber(signalRow?.highCostCallCount),
    zeroCacheCallCount: normalizeNumber(signalRow?.zeroCacheCallCount),
    highOutputRatioCallCount: normalizeNumber(
      signalRow?.highOutputRatioCallCount,
    ),
    peakRequestsPerMinute,
    avgRequestsPerMinute,
    requestsPerMinuteSpikeRatio,
    rpmSpikeDetected: requestsPerMinuteSpikeRatio > 3,
  };
}

export async function getAgentUsageMonitoring(range: MonitoringDateRange) {
  const [
    summary,
    providerUsage,
    dailyUsageTrend,
    recentCalls,
    sourceVolume,
    hourlyUsage,
    agentEfficiency,
    providerModelComparison,
    topUsersBySpend,
    fxRateDrift,
    anomalySignals,
  ] = await Promise.all([
    getMonitoringSummary(range),
    getProviderUsage(range),
    getDailyUsageTrend(range),
    getRecentAgentCalls(range),
    getSourceVolume(range),
    getHourlyUsageDistribution(range),
    getAgentEfficiency(range),
    getProviderModelComparison(range),
    getTopUsersBySpend(range),
    getFxRateDrift(range),
    getAnomalySignals(range),
  ]);

  return {
    summary,
    providerUsage,
    dailyUsageTrend,
    recentCalls,
    sourceVolume,
    hourlyUsage,
    agentEfficiency,
    providerModelComparison,
    topUsersBySpend,
    fxRateDrift,
    anomalySignals,
  };
}
