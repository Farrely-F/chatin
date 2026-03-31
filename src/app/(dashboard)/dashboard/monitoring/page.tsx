import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { UsageCharts } from "@/features/monitoring/usage-charts";
import { getAgentUsageMonitoring } from "@/service/monitoring";

export const dynamic = "force-dynamic";

type MonitoringSearchParams = Promise<{
  from?: string | string[];
  to?: string | string[];
  q?: string | string[];
  provider?: string | string[];
  source?: string | string[];
  cache?: string | string[];
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

export default async function MonitoringPage({
  searchParams,
}: {
  readonly searchParams: MonitoringSearchParams;
}) {
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

  const from = parseDateParam(fromParam, false) ?? defaultFrom;
  const to = parseDateParam(toParam, true) ?? defaultTo;

  const safeRange =
    from <= to ? { from, to } : { from: defaultFrom, to: defaultTo };

  const monitoring = await getAgentUsageMonitoring(safeRange);

  const providerOptions = Array.from(
    new Set(monitoring.recentCalls.map((call) => call.provider)),
  ).sort((a, b) => a.localeCompare(b));

  const sourceOptions = Array.from(
    new Set(monitoring.recentCalls.map((call) => call.source)),
  ).sort((a, b) => a.localeCompare(b));

  const queryLower = queryParam?.toLowerCase();

  const filteredRecentCalls = monitoring.recentCalls.filter((call) => {
    if (providerParam && call.provider !== providerParam) {
      return false;
    }

    if (sourceParam && call.source !== sourceParam) {
      return false;
    }

    if (cacheParam === "hit" && call.cacheHitRate <= 0) {
      return false;
    }

    if (cacheParam === "miss" && call.cacheHitRate > 0) {
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

  return (
    <PageLayout className="container mx-auto space-y-8">
      <PageLayoutHeader className="space-y-3 pt-10">
        <h1 className="text-3xl font-bold tracking-tight">
          Agent Usage Monitoring
        </h1>
        <p className="text-muted-foreground">
          Track AI provider usage, token consumption, and cost projection.
        </p>

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

          <Button type="submit" className="h-9">
            Apply Filter
          </Button>
        </form>
      </PageLayoutHeader>

      <PageLayoutContent className="gap-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
        />

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
