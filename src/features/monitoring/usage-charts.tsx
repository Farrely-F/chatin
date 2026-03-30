"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

type ProviderData = {
  provider: string;
  calls: number;
  totalTokens: number;
  costUsd: number;
};

type DailyData = {
  day: string;
  calls: number;
  totalTokens: number;
  costUsd: number;
};

const providerChartConfig = {
  costUsd: {
    label: "Cost (USD)",
    color: "hsl(14 84% 60%)",
  },
  calls: {
    label: "Calls",
    color: "hsl(221 83% 53%)",
  },
} satisfies ChartConfig;

const trendChartConfig = {
  costUsd: {
    label: "Cost (USD)",
    color: "hsl(14 84% 60%)",
  },
  totalTokens: {
    label: "Tokens",
    color: "hsl(160 84% 39%)",
  },
} satisfies ChartConfig;

function formatShortDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function UsageCharts({
  providerData,
  dailyData,
}: Readonly<{
  providerData: ProviderData[];
  dailyData: DailyData[];
}>) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Cost by Provider</CardTitle>
          <CardDescription>
            Compare provider spend and call volume for the selected date range.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {providerData.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No usage data found.
            </p>
          ) : (
            <ChartContainer
              config={providerChartConfig}
              className="h-72 min-h-[18rem] w-full"
            >
              <BarChart data={providerData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="provider" tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  yAxisId="left"
                  dataKey="costUsd"
                  fill="var(--color-costUsd)"
                  radius={4}
                />
                <Bar
                  yAxisId="right"
                  dataKey="calls"
                  fill="var(--color-calls)"
                  radius={4}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Spend and Tokens</CardTitle>
          <CardDescription>
            Daily usage trend to spot spikes in traffic and costs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dailyData.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No usage data found.
            </p>
          ) : (
            <ChartContainer
              config={trendChartConfig}
              className="h-72 min-h-[18rem] w-full"
            >
              <LineChart data={dailyData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="day"
                  tickFormatter={formatShortDate}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis yAxisId="left" tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  content={<ChartTooltipContent indicator="line" />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="costUsd"
                  stroke="var(--color-costUsd)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="totalTokens"
                  stroke="var(--color-totalTokens)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
