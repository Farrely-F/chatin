import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutHeader,
} from "@/components/ui/layout/page-layout";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsageCharts } from "@/features/monitoring/usage-charts";
import { getCurrentUser } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/check-permission";
import { getAgentUsageMonitoring } from "@/service/monitoring";
import { getAllOrganizationsWithMembers } from "@/service/organizations";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type MonitoringSearchParams = Promise<{
  from?: string | string[];
  to?: string | string[];
  q?: string | string[];
  provider?: string | string[];
  source?: string | string[];
  cache?: string | string[];
  organization?: string | string[];
}>;

function getFirstParam(value?: string | string[]): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function parseDateParam(value?: string, endOfDay?: boolean): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const suffix = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z";
  const parsed = new Date(`${value}${suffix}`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function normalizeTextParam(value?: string): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function normalizeSelectParam(value?: string): string | undefined {
  const normalized = normalizeTextParam(value);
  if (!normalized || normalized === "all") {
    return undefined;
  }

  return normalized;
}

function parseCacheFilterParam(value?: string): "all" | "hit" | "miss" {
  if (value === "hit" || value === "miss") {
    return value;
  }

  return "all";
}

function formatCurrencyUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  }).format(value);
}

function formatCurrencyIdr(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatRatio(value: number): string {
  return `${value.toFixed(2)}x`;
}

function truncateUserId(value: string): string {
  if (value.length <= 16) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

type MonitoringPayload = Awaited<ReturnType<typeof getAgentUsageMonitoring>>;
type RecentCall = MonitoringPayload["recentCalls"][number];

function filterRecentCalls(
  calls: RecentCall[],
  filters: {
    providerParam?: string;
    sourceParam?: string;
    cacheParam: "all" | "hit" | "miss";
    queryParam?: string;
  },
): RecentCall[] {
  const queryLower = filters.queryParam?.toLowerCase();

  return calls.filter((call) => {
    if (filters.providerParam && call.provider !== filters.providerParam) {
      return false;
    }

    if (filters.sourceParam && call.source !== filters.sourceParam) {
      return false;
    }

    if (filters.cacheParam === "hit" && call.cacheHitRate <= 0) {
      return false;
    }

    if (filters.cacheParam === "miss" && call.cacheHitRate > 0) {
      return false;
    }

    if (!queryLower) {
      return true;
    }

    const searchTarget = [
      call.agentName,
      call.provider,
      call.model,
      call.source,
    ]
      .join(" ")
      .toLowerCase();

    return searchTarget.includes(queryLower);
  });
}

function TopOrganizationsSpendCard({
  rows,
}: {
  readonly rows: MonitoringPayload["topOrganizationsBySpend"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Organizations by Spend</CardTitle>
        <CardDescription>
          Highest spending organizations in the selected range.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No organization spend in this date range.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Total Tokens</TableHead>
                <TableHead>Spend (USD)</TableHead>
                <TableHead>Spend (IDR)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.organizationId}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span>{row.organizationName}</span>
                      <span className="text-muted-foreground text-xs">
                        {row.organizationSlug}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{row.requests.toLocaleString()}</TableCell>
                  <TableCell>{row.totalTokens.toLocaleString()}</TableCell>
                  <TableCell>{formatCurrencyUsd(row.spendUsd)}</TableCell>
                  <TableCell>{formatCurrencyIdr(row.spendIdr)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function TopUsersSpendCard({
  rows,
}: {
  readonly rows: MonitoringPayload["topUsersBySpend"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Users by Spend</CardTitle>
        <CardDescription>
          Highest spending authenticated users in the selected range.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No authenticated user spend in this date range.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Total Tokens</TableHead>
                <TableHead>Spend (USD)</TableHead>
                <TableHead>Spend (IDR)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.requestUserId}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span>{row.requestUserName ?? "Unknown User"}</span>
                      <span className="text-muted-foreground text-xs">
                        {row.requestUserEmail ?? "No email"}
                      </span>
                      <div className="text-muted-foreground flex items-center gap-1 text-xs">
                        <span>{truncateUserId(row.requestUserId)}</span>
                        <CopyButton
                          value={row.requestUserId}
                          className="h-5 w-5"
                          aria-label={`Copy user ID for ${row.requestUserName ?? row.requestUserId}`}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{row.requests.toLocaleString()}</TableCell>
                  <TableCell>{row.totalTokens.toLocaleString()}</TableCell>
                  <TableCell>{formatCurrencyUsd(row.spendUsd)}</TableCell>
                  <TableCell>{formatCurrencyIdr(row.spendIdr)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default async function MonitoringPage({
  searchParams,
}: {
  readonly searchParams: MonitoringSearchParams;
}) {
  const user = await getCurrentUser();
  const userId = user?.id ?? "";

  const params = await searchParams;

  const now = new Date();
  const defaultTo = new Date(now);
  defaultTo.setUTCHours(23, 59, 59, 999);

  const defaultFrom = new Date(defaultTo);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29);
  defaultFrom.setUTCHours(0, 0, 0, 0);

  const fromParam = getFirstParam(params.from);
  const toParam = getFirstParam(params.to);
  const queryParam = normalizeTextParam(getFirstParam(params.q));
  const providerParam = normalizeSelectParam(getFirstParam(params.provider));
  const sourceParam = normalizeSelectParam(getFirstParam(params.source));
  const cacheParam = parseCacheFilterParam(getFirstParam(params.cache));
  const organizationParam = normalizeSelectParam(
    getFirstParam(params.organization),
  );

  const from = parseDateParam(fromParam, false) ?? defaultFrom;
  const to = parseDateParam(toParam, true) ?? defaultTo;

  const safeRange =
    from <= to ? { from, to } : { from: defaultFrom, to: defaultTo };

  const hasSystemAccess = await hasPermission(userId, "system.read");

  if (!hasSystemAccess) {
    redirect("/dashboard/monitoring/organization");
  }

  const monitoring = await getAgentUsageMonitoring(
    safeRange,
    organizationParam,
  );

  const organizationsResult = await getAllOrganizationsWithMembers(userId);
  const organizationOptions =
    "error" in organizationsResult
      ? []
      : organizationsResult.map((organization) => ({
          id: organization.id,
          name: organization.name,
        }));

  const providerOptions = Array.from(
    new Set(monitoring.recentCalls.map((call) => call.provider)),
  ).sort((a, b) => a.localeCompare(b));

  const sourceOptions = Array.from(
    new Set(monitoring.recentCalls.map((call) => call.source)),
  ).sort((a, b) => a.localeCompare(b));

  const filteredRecentCalls = filterRecentCalls(monitoring.recentCalls, {
    providerParam,
    sourceParam,
    cacheParam,
    queryParam,
  });

  const topAgentEfficiency = monitoring.agentEfficiency.slice(0, 10);
  const topProviderModels = monitoring.providerModelComparison.slice(0, 10);

  return (
    <PageLayout className="space-y-8">
      <PageLayoutHeader className="container mx-auto space-y-3 pt-10">
        <h1 className="text-3xl font-bold tracking-tight">
          Agent Usage Monitoring
        </h1>
        <p className="text-muted-foreground">
          Track AI provider usage, token consumption, and cost projection.
        </p>

        <Tabs value="overview">
          <TabsList>
            <TabsTrigger value="overview" asChild>
              <Link href="/dashboard/monitoring">Overview</Link>
            </TabsTrigger>
            <TabsTrigger value="public-agents" asChild>
              <Link href="/dashboard/monitoring/deployed-agents">
                Deployed Agents
              </Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <form className="flex flex-wrap items-end gap-3" method="get">
          {queryParam ? (
            <input type="hidden" name="q" value={queryParam} />
          ) : null}
          {providerParam ? (
            <input type="hidden" name="provider" value={providerParam} />
          ) : null}
          {sourceParam ? (
            <input type="hidden" name="source" value={sourceParam} />
          ) : null}
          {cacheParam === "all" ? null : (
            <input type="hidden" name="cache" value={cacheParam} />
          )}

          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">From</span>
            <DatePicker
              name="from"
              defaultValue={toDateInputValue(safeRange.from)}
              placeholder="Select start date"
              maxYear={new Date().getFullYear() + 1}
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">To</span>
            <DatePicker
              name="to"
              defaultValue={toDateInputValue(safeRange.to)}
              placeholder="Select end date"
              maxYear={new Date().getFullYear() + 1}
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">
              Organization
            </span>
            <Select
              name="organization"
              defaultValue={organizationParam ?? "all"}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="All organizations" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All organizations</SelectItem>
                  {organizationOptions.map((organization) => (
                    <SelectItem key={organization.id} value={organization.id}>
                      {organization.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>

          <Button type="submit" className="h-9">
            Apply Filter
          </Button>
        </form>
      </PageLayoutHeader>

      <PageLayoutContent className="gap-4 gap-y-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Card>
            <CardHeader className="space-y-1 pb-0">
              <CardDescription>Total Agent Calls</CardDescription>
              <CardTitle>
                {monitoring.summary.totalCalls.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">
                Unique agents:{" "}
                {monitoring.summary.uniqueAgents.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1 pb-0">
              <CardDescription>Total Tokens</CardDescription>
              <CardTitle>
                {monitoring.summary.totalTokens.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">
                In: {monitoring.summary.totalInputTokens.toLocaleString()} |
                Out: {monitoring.summary.totalOutputTokens.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1 pb-0">
              <CardDescription>Total Cost (USD)</CardDescription>
              <CardTitle>
                {formatCurrencyUsd(monitoring.summary.totalCostUsd)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">
                Avg/call:{" "}
                {formatCurrencyUsd(monitoring.summary.averageCostUsdPerCall)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1 pb-0">
              <CardDescription>Total Cost (IDR)</CardDescription>
              <CardTitle>
                {formatCurrencyIdr(monitoring.summary.totalCostIdr)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">
                Cache hit: {formatPercent(monitoring.summary.cacheHitRate)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1 pb-0">
              <CardDescription>Unique Request Users</CardDescription>
              <CardTitle>
                {monitoring.summary.uniqueRequestUsers.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">
                Authenticated usage footprint
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1 pb-0">
              <CardDescription>p99 Tokens/Request</CardDescription>
              <CardTitle>
                {Math.round(
                  monitoring.anomalySignals.tokenP99,
                ).toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">
                Outlier requests:{" "}
                {monitoring.anomalySignals.highTokenCallCount.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader className="space-y-1 pb-0">
              <CardDescription>Error Rate</CardDescription>
              <CardTitle>
                {formatPercent(monitoring.summary.errorRate)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">
                From logged failures in selected range
              </p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader className="space-y-1 pb-0">
              <CardDescription>Average Latency</CardDescription>
              <CardTitle>
                {Math.round(
                  monitoring.summary.averageLatencyMs,
                ).toLocaleString()}{" "}
                ms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">
                Includes only rows with latency telemetry
              </p>
            </CardContent>
          </Card>
        </div>

        <UsageCharts
          providerData={monitoring.providerUsage.map((item) => ({
            provider: item.provider,
            calls: item.calls,
            totalTokens: item.totalTokens,
            costUsd: item.costUsd,
          }))}
          dailyData={monitoring.dailyUsageTrend.map((item) => ({
            day: item.day,
            calls: item.calls,
            totalTokens: item.totalTokens,
            costUsd: item.costUsd,
          }))}
          hourlyData={monitoring.hourlyUsage.map((item) => ({
            hour: item.hour,
            calls: item.calls,
          }))}
        />

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Anomaly Signals</CardTitle>
              <CardDescription>
                Automatic checks for token outliers, cost spikes, cache
                regressions, and traffic bursts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={
                    monitoring.anomalySignals.rpmSpikeDetected
                      ? "destructive"
                      : "secondary"
                  }
                >
                  RPM Spike{" "}
                  {monitoring.anomalySignals.rpmSpikeDetected
                    ? "Detected"
                    : "Normal"}
                </Badge>
                <Badge
                  variant={
                    monitoring.fxRateDrift.exceedsThreshold
                      ? "destructive"
                      : "secondary"
                  }
                >
                  FX Drift{" "}
                  {monitoring.fxRateDrift.exceedsThreshold ? "> 5%" : "Stable"}
                </Badge>
              </div>
              <div className="grid gap-2 text-sm md:grid-cols-2">
                <p>
                  Peak req/min:{" "}
                  <strong>
                    {monitoring.anomalySignals.peakRequestsPerMinute.toLocaleString()}
                  </strong>
                </p>
                <p>
                  Avg req/min:{" "}
                  <strong>
                    {monitoring.anomalySignals.avgRequestsPerMinute.toFixed(2)}
                  </strong>
                </p>
                <p>
                  RPM spike ratio:{" "}
                  <strong>
                    {formatRatio(
                      monitoring.anomalySignals.requestsPerMinuteSpikeRatio,
                    )}
                  </strong>
                </p>
                <p>
                  High output ratio (&gt;5x):{" "}
                  <strong>
                    {monitoring.anomalySignals.highOutputRatioCallCount.toLocaleString()}
                  </strong>
                </p>
                <p>
                  High cost requests:{" "}
                  <strong>
                    {monitoring.anomalySignals.highCostCallCount.toLocaleString()}
                  </strong>
                </p>
                <p>
                  Zero-cache calls:{" "}
                  <strong>
                    {monitoring.anomalySignals.zeroCacheCallCount.toLocaleString()}
                  </strong>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Source and FX Health</CardTitle>
              <CardDescription>
                Source distribution and exchange-rate consistency for USD to IDR
                conversion.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {monitoring.sourceVolume.map((source) => (
                  <Badge key={source.source} variant="outline">
                    {source.source}: {source.calls.toLocaleString()}
                  </Badge>
                ))}
              </div>
              <div className="grid gap-2 text-sm md:grid-cols-2">
                <p>
                  Baseline FX:{" "}
                  <strong>
                    {monitoring.fxRateDrift.baselineFx.toLocaleString()}
                  </strong>
                </p>
                <p>
                  Avg FX:{" "}
                  <strong>{monitoring.fxRateDrift.averageFx.toFixed(2)}</strong>
                </p>
                <p>
                  Min FX:{" "}
                  <strong>{monitoring.fxRateDrift.minFx.toFixed(2)}</strong>
                </p>
                <p>
                  Max FX:{" "}
                  <strong>{monitoring.fxRateDrift.maxFx.toFixed(2)}</strong>
                </p>
                <p>
                  Drift:{" "}
                  <strong>
                    {formatPercent(monitoring.fxRateDrift.deviationRate)}
                  </strong>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Agent Efficiency (Top 10 by Cost)</CardTitle>
              <CardDescription>
                Cache efficiency, verbosity ratio, token outliers, and blended
                token pricing per agent.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topAgentEfficiency.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No efficiency data in this date range.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Calls</TableHead>
                      <TableHead>Cache Hit</TableHead>
                      <TableHead>Output/Input</TableHead>
                      <TableHead>p95 Tokens</TableHead>
                      <TableHead>Cost/1k</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topAgentEfficiency.map((row) => (
                      <TableRow key={row.agentId}>
                        <TableCell>{row.agentName}</TableCell>
                        <TableCell>{row.calls.toLocaleString()}</TableCell>
                        <TableCell>{formatPercent(row.cacheHitRate)}</TableCell>
                        <TableCell>{formatRatio(row.outputRatio)}</TableCell>
                        <TableCell>
                          {Math.round(row.p95Tokens).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {formatCurrencyUsd(row.costPer1kTokensUsd)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Provider and Model Comparison (Top 10)</CardTitle>
              <CardDescription>
                Compare request volume, average token size, and spend by
                provider-model pair.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topProviderModels.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No provider-model data in this date range.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Requests</TableHead>
                      <TableHead>Avg Tokens</TableHead>
                      <TableHead>Avg Cost</TableHead>
                      <TableHead>Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProviderModels.map((row) => (
                      <TableRow key={`${row.provider}-${row.modelId}`}>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {row.provider}
                          </Badge>
                        </TableCell>
                        <TableCell>{row.model}</TableCell>
                        <TableCell>{row.requests.toLocaleString()}</TableCell>
                        <TableCell>
                          {Math.round(row.avgTokens).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {formatCurrencyUsd(row.avgCostUsd)}
                        </TableCell>
                        <TableCell>
                          {formatCurrencyUsd(row.totalCostUsd)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <TopOrganizationsSpendCard rows={monitoring.topOrganizationsBySpend} />

        <TopUsersSpendCard rows={monitoring.topUsersBySpend} />

        <Card>
          <CardHeader>
            <CardTitle>Most Recent 50 Agent Calls</CardTitle>
            <CardDescription>
              Includes provider, model, token usage, and USD/IDR spend for each
              call. Showing {filteredRecentCalls.length.toLocaleString()} of{" "}
              {monitoring.recentCalls.length.toLocaleString()} rows.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="mb-4 flex flex-wrap items-end gap-3" method="get">
              <input
                type="hidden"
                name="from"
                value={toDateInputValue(safeRange.from)}
              />
              <input
                type="hidden"
                name="to"
                value={toDateInputValue(safeRange.to)}
              />
              {organizationParam ? (
                <input
                  type="hidden"
                  name="organization"
                  value={organizationParam}
                />
              ) : null}

              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Search</span>
                <Input
                  type="text"
                  name="q"
                  className="w-56"
                  placeholder="Agent, provider, model, source"
                  defaultValue={queryParam}
                />
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">
                  Provider
                </span>
                <Select name="provider" defaultValue={providerParam ?? "all"}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="All providers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All providers</SelectItem>
                      {providerOptions.map((provider) => (
                        <SelectItem key={provider} value={provider}>
                          {provider}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Source</span>
                <Select name="source" defaultValue={sourceParam ?? "all"}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="All sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All sources</SelectItem>
                      {sourceOptions.map((source) => (
                        <SelectItem key={source} value={source}>
                          {source}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Cache</span>
                <Select name="cache" defaultValue={cacheParam}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="hit">Hit only</SelectItem>
                      <SelectItem value="miss">Miss only</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </label>

              <Button type="submit" className="h-9">
                Filter Table
              </Button>
            </form>

            {filteredRecentCalls.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No usage data in the selected date range.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Input Tokens</TableHead>
                    <TableHead>Output Tokens</TableHead>
                    <TableHead>Cost (USD)</TableHead>
                    <TableHead>Cost (IDR)</TableHead>
                    <TableHead>Cache Hit</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecentCalls.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell>
                        {call.createdAt.toLocaleString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>{call.agentName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {call.provider}
                        </Badge>
                      </TableCell>
                      <TableCell>{call.model}</TableCell>
                      <TableCell>{call.inputTokens.toLocaleString()}</TableCell>
                      <TableCell>
                        {call.outputTokens.toLocaleString()}
                      </TableCell>
                      <TableCell>{formatCurrencyUsd(call.costUsd)}</TableCell>
                      <TableCell>{formatCurrencyIdr(call.costIdr)}</TableCell>
                      <TableCell>{formatPercent(call.cacheHitRate)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{call.source}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </PageLayoutContent>
    </PageLayout>
  );
}
