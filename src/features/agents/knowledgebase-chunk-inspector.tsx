"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, truncateCharacters } from "@/lib/utils";
import {
  KnowledgeBase,
  KnowledgeChunk,
  KnowledgeProbeResult,
  getAllKnowledgeChunks,
  probeKnowledgeChunks,
} from "@/service/knowledgebases";
import {
  AlertTriangle,
  Loader2,
  Search,
  Sparkles,
  Telescope,
} from "lucide-react";
import { ReactNode, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

type ChunkPoint = KnowledgeChunk & {
  index: number;
  mapX: number;
  mapY: number;
  clusterId: number;
  keywordCount: number;
  maxNeighborScore: number;
  denseNeighborRatio: number;
  signature: Set<string>;
};

type DuplicatePair = {
  firstId: string;
  secondId: string;
  similarity: number;
};

type ChunkAnalysis = {
  points: ChunkPoint[];
  duplicates: DuplicatePair[];
  minTokens: number;
  maxTokens: number;
};

type HealthSummary = {
  totalChunks: number;
  totalTokens: number;
  avgTokens: number;
  veryShortCount: number;
  longCount: number;
  outlierCount: number;
  duplicateCount: number;
  staleDays: number;
  sparseCoverageCount: number;
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "was",
  "were",
  "will",
  "with",
]);

const CLUSTER_COLORS = [
  "fill-chart-1",
  "fill-chart-2",
  "fill-chart-3",
  "fill-chart-4",
  "fill-chart-5",
  "fill-primary",
];

const SCORE_BADGE_STYLE: Record<"good" | "mid" | "low", string> = {
  good: "bg-emerald-100 text-emerald-800 border-emerald-300",
  mid: "bg-amber-100 text-amber-800 border-amber-300",
  low: "bg-rose-100 text-rose-800 border-rose-300",
};

function hashText(input: string) {
  let hash = 0;

  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + (input.codePointAt(i) ?? 0)) >>> 0;
  }

  return hash;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function signature(text: string) {
  return new Set(
    text
      .toLowerCase()
      .replaceAll(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !STOP_WORDS.has(word))
      .slice(0, 28),
  );
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of a) {
    if (b.has(token)) {
      overlap += 1;
    }
  }

  return overlap / (a.size + b.size - overlap);
}

function projectTo2D(textSignature: Set<string>, tokenCount: number) {
  const tokens = Array.from(textSignature);
  const seedX = hashText(tokens.slice(0, 8).join(" "));
  const seedY = hashText(tokens.slice(8, 16).join(" "));
  const baseX = (seedX % 1000) / 1000;
  const baseY = (seedY % 1000) / 1000;
  const tokenInfluence = clamp(tokenCount / 1500, 0, 1);

  return {
    x: clamp(baseX * 0.85 + tokenInfluence * 0.15, 0.04, 0.96),
    y: clamp(baseY * 0.85 + (1 - tokenInfluence) * 0.15, 0.04, 0.96),
  };
}

function buildBasePoints(chunks: KnowledgeChunk[]) {
  return chunks.map((chunk, index) => {
    const chunkSignature = signature(chunk.content);
    const projection = projectTo2D(chunkSignature, chunk.tokenCount);
    const clusterSeed = hashText(
      Array.from(chunkSignature).slice(0, 4).join("|"),
    );

    return {
      ...chunk,
      index,
      mapX: projection.x,
      mapY: projection.y,
      clusterId: clusterSeed % CLUSTER_COLORS.length,
      keywordCount: chunkSignature.size,
      maxNeighborScore: 0,
      denseNeighborRatio: 0,
      signature: chunkSignature,
    } satisfies ChunkPoint;
  });
}

function computeNeighborStats(points: ChunkPoint[]) {
  const matrix: number[][] = points.map(() => points.map(() => 0));

  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const score = jaccard(points[i].signature, points[j].signature);
      matrix[i][j] = score;
      matrix[j][i] = score;
    }
  }

  return points.map((point, idx) => {
    const row = matrix[idx];
    const bestNeighbor = row.reduce((max, value) => Math.max(max, value), 0);
    const denseNeighbors = row.filter((value) => value >= 0.22).length;
    const denseNeighborRatio =
      points.length <= 1 ? 0 : denseNeighbors / (points.length - 1);

    return {
      ...point,
      maxNeighborScore: bestNeighbor,
      denseNeighborRatio,
    } satisfies ChunkPoint;
  });
}

function detectDuplicatePairs(points: ChunkPoint[]) {
  const pairs: DuplicatePair[] = [];

  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const score = jaccard(points[i].signature, points[j].signature);
      if (score >= 0.9) {
        pairs.push({
          firstId: points[i].id,
          secondId: points[j].id,
          similarity: score,
        });
      }
    }
  }

  const sortedPairs = pairs.toSorted((a, b) => b.similarity - a.similarity);

  return sortedPairs.slice(0, 30);
}

function buildAnalysis(chunks: KnowledgeChunk[]): ChunkAnalysis {
  if (chunks.length === 0) {
    return {
      points: [],
      duplicates: [],
      minTokens: 0,
      maxTokens: 0,
    };
  }

  const basePoints = buildBasePoints(chunks);
  const points = computeNeighborStats(basePoints);
  const duplicates = detectDuplicatePairs(points.slice(0, 280));

  return {
    points,
    duplicates,
    minTokens: Math.min(...points.map((point) => point.tokenCount)),
    maxTokens: Math.max(...points.map((point) => point.tokenCount)),
  };
}

function isOutlier(point: ChunkPoint) {
  return point.maxNeighborScore < 0.12;
}

function scoreTier(score: number): "good" | "mid" | "low" {
  if (score >= 0.75) {
    return "good";
  }

  if (score >= 0.45) {
    return "mid";
  }

  return "low";
}

function getTokenRadius(
  point: ChunkPoint,
  minTokens: number,
  maxTokens: number,
) {
  if (maxTokens === minTokens) {
    return 1.8;
  }

  const ratio = (point.tokenCount - minTokens) / (maxTokens - minTokens);
  return 1.2 + ratio * 1.8;
}

function getChunkLabel(chunk: ChunkPoint) {
  return `#${chunk.index + 1} - ${chunk.tokenCount} tokens`;
}

function getHealthSummary(
  points: ChunkPoint[],
  duplicates: DuplicatePair[],
  createdAt: Date | null,
): HealthSummary {
  if (points.length === 0) {
    return {
      totalChunks: 0,
      totalTokens: 0,
      avgTokens: 0,
      veryShortCount: 0,
      longCount: 0,
      outlierCount: 0,
      duplicateCount: 0,
      staleDays: 0,
      sparseCoverageCount: 0,
    };
  }

  const totalTokens = points.reduce((sum, point) => sum + point.tokenCount, 0);
  const staleDays = createdAt
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  return {
    totalChunks: points.length,
    totalTokens,
    avgTokens: Math.round(totalTokens / points.length),
    veryShortCount: points.filter((point) => point.tokenCount < 80).length,
    longCount: points.filter((point) => point.tokenCount > 900).length,
    outlierCount: points.filter((point) => isOutlier(point)).length,
    duplicateCount: duplicates.length,
    staleDays,
    sparseCoverageCount: points.filter(
      (point) => point.denseNeighborRatio < 0.03,
    ).length,
  };
}

function getLocalSimilarChunks(
  points: ChunkPoint[],
  selectedChunkId: string | null,
) {
  if (!selectedChunkId) {
    return [] as Array<{ chunk: ChunkPoint; score: number }>;
  }

  const selectedChunk = points.find((point) => point.id === selectedChunkId);

  if (!selectedChunk) {
    return [] as Array<{ chunk: ChunkPoint; score: number }>;
  }

  return points
    .filter((point) => point.id !== selectedChunk.id)
    .map((point) => ({
      chunk: point,
      score: jaccard(selectedChunk.signature, point.signature),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .filter((entry) => entry.score > 0.08);
}

export default function KnowledgebaseChunkInspector({
  agentId,
  knowledgeBase,
  children,
}: Readonly<{
  agentId: string;
  knowledgeBase: KnowledgeBase;
  children: ReactNode;
}>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    "tokens-desc" | "tokens-asc" | "cluster" | "outliers"
  >("tokens-desc");
  const [probeQuery, setProbeQuery] = useState("");
  const [probeResults, setProbeResults] = useState<KnowledgeProbeResult[]>([]);
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null);
  const [chunks, setChunks] = useState<KnowledgeChunk[] | null>(null);
  const [isLoadingChunks, startLoadChunks] = useTransition();
  const [isProbing, startProbe] = useTransition();

  const analysis = useMemo(() => buildAnalysis(chunks ?? []), [chunks]);

  const sortedChunks = useMemo(() => {
    const cloned = [...analysis.points];

    if (sortBy === "tokens-desc") {
      return cloned.sort((a, b) => b.tokenCount - a.tokenCount);
    }

    if (sortBy === "tokens-asc") {
      return cloned.sort((a, b) => a.tokenCount - b.tokenCount);
    }

    if (sortBy === "cluster") {
      return cloned.sort(
        (a, b) => a.clusterId - b.clusterId || b.tokenCount - a.tokenCount,
      );
    }

    return cloned.sort((a, b) => Number(isOutlier(b)) - Number(isOutlier(a)));
  }, [analysis.points, sortBy]);

  const filteredChunks = useMemo(() => {
    if (sortedChunks.length === 0) {
      return [];
    }

    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return sortedChunks;
    }

    return sortedChunks.filter((chunk) =>
      `${chunk.content} ${chunk.tokenCount} ${chunk.clusterId}`
        .toLowerCase()
        .includes(keyword),
    );
  }, [sortedChunks, search]);

  const selectedChunk = useMemo(
    () => analysis.points.find((chunk) => chunk.id === selectedChunkId) ?? null,
    [analysis.points, selectedChunkId],
  );

  const localSimilarChunks = useMemo(
    () => getLocalSimilarChunks(analysis.points, selectedChunkId),
    [analysis.points, selectedChunkId],
  );

  const health = useMemo(
    () =>
      getHealthSummary(
        analysis.points,
        analysis.duplicates,
        knowledgeBase.createdAt ?? null,
      ),
    [analysis.duplicates, analysis.points, knowledgeBase.createdAt],
  );

  const mapPoints = useMemo(
    () => analysis.points.slice(0, 260),
    [analysis.points],
  );

  const loadChunks = () => {
    if (chunks || isLoadingChunks) {
      return;
    }

    startLoadChunks(async () => {
      try {
        const result = await getAllKnowledgeChunks(agentId, knowledgeBase.id);

        setChunks(result);
        setSelectedChunkId(result[0]?.id ?? null);
      } catch {
        toast.error("Failed to load ingested chunks");
      }
    });
  };

  const runQueryProbe = () => {
    const cleaned = probeQuery.trim();

    if (!cleaned) {
      toast.error("Enter a query to run retrieval probe");
      return;
    }

    startProbe(async () => {
      try {
        const result = await probeKnowledgeChunks(
          cleaned,
          agentId,
          knowledgeBase.id,
          12,
        );
        setProbeResults(result);

        if (result[0]) {
          setSelectedChunkId(result[0].id);
        }
      } catch {
        toast.error("Failed to run query probe");
      }
    });
  };

  const renderLoadingState = () => {
    if (isLoadingChunks && !chunks) {
      return (
        <div className="min-h-[420px] rounded-lg border bg-muted/20 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading chunk diagnostics...
        </div>
      );
    }

    return null;
  };

  const renderMapView = () => {
    if (mapPoints.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">No chunks available.</p>
      );
    }

    return (
      <div className="rounded-lg border bg-muted/10 p-3">
        <div className="flex items-center justify-between pb-2">
          <p className="text-sm font-medium">
            2D Semantic Scatter (projection)
          </p>
          <Badge variant="secondary">{mapPoints.length} plotted chunks</Badge>
        </div>

        <svg
          viewBox="0 0 100 100"
          className="w-full h-[360px] rounded-md border bg-background"
        >
          {mapPoints.map((point) => {
            const radius = getTokenRadius(
              point,
              analysis.minTokens,
              analysis.maxTokens,
            );
            const cx = point.mapX * 100;
            const cy = (1 - point.mapY) * 100;
            const outlier = isOutlier(point);
            const selected = point.id === selectedChunkId;

            return (
              <g key={point.id}>
                {outlier && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius + 0.9}
                    className="fill-none stroke-rose-500"
                    strokeWidth={0.4}
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={selected ? radius + 0.6 : radius}
                  className={cn(
                    "cursor-pointer transition-all",
                    CLUSTER_COLORS[point.clusterId],
                    selected && "stroke-black stroke-[0.4]",
                  )}
                  onClick={() => setSelectedChunkId(point.id)}
                >
                  <title>
                    {`Chunk ${point.index + 1} | ${point.tokenCount} tokens | cluster ${point.clusterId + 1}`}
                  </title>
                </circle>
              </g>
            );
          })}
        </svg>

        <p className="text-xs text-muted-foreground mt-2">
          Dot size = token count, color = cluster, red ring = outlier candidate.
        </p>
      </div>
    );
  };

  const renderBrowserTable = () => {
    if (filteredChunks.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          No chunks match your filter.
        </p>
      );
    }

    return (
      <ScrollArea className="h-[390px] rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Chunk</TableHead>
              <TableHead>Tokens</TableHead>
              <TableHead>Cluster</TableHead>
              <TableHead>Density</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredChunks.map((chunk) => (
              <TableRow
                key={chunk.id}
                className={cn(
                  "cursor-pointer",
                  selectedChunkId === chunk.id && "bg-primary/5",
                )}
                onClick={() => setSelectedChunkId(chunk.id)}
              >
                <TableCell className="max-w-[340px]">
                  <p className="text-xs text-muted-foreground">
                    {getChunkLabel(chunk)}
                  </p>
                  <p className="truncate">
                    {truncateCharacters(chunk.content, 80)}
                  </p>
                </TableCell>
                <TableCell>{chunk.tokenCount}</TableCell>
                <TableCell>
                  <Badge variant="outline">#{chunk.clusterId + 1}</Badge>
                </TableCell>
                <TableCell>
                  {Math.round(chunk.denseNeighborRatio * 100)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    );
  };

  const renderProbeView = () => (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input
          value={probeQuery}
          onChange={(event) => setProbeQuery(event.target.value)}
          placeholder="Type a real user query to test retrieval"
        />
        <Button onClick={runQueryProbe} disabled={isProbing}>
          {isProbing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Telescope className="size-4" />
          )}
          Probe
        </Button>
      </div>

      <ScrollArea className="h-[390px] rounded-lg border p-3">
        <div className="flex flex-col gap-2">
          {probeResults.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Run a probe to see ranked chunks and similarity scores.
            </p>
          )}

          {probeResults.map((result, index) => {
            const tier = scoreTier(result.similarityScore);
            const barWidth = Math.max(
              4,
              Math.round(result.similarityScore * 100),
            );

            return (
              <button
                type="button"
                key={result.id}
                onClick={() => setSelectedChunkId(result.id)}
                className={cn(
                  "text-left border rounded-md p-2 hover:bg-muted/30 transition-colors",
                  selectedChunkId === result.id &&
                    "border-primary bg-primary/5",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Rank #{index + 1}
                  </p>
                  <Badge variant="outline" className={SCORE_BADGE_STYLE[tier]}>
                    {(result.similarityScore * 100).toFixed(1)}%
                  </Badge>
                </div>
                <div className="h-1.5 bg-muted rounded mt-2 mb-2 overflow-hidden">
                  <div
                    className={cn(
                      "h-full",
                      tier === "good" && "bg-emerald-500",
                      tier === "mid" && "bg-amber-500",
                      tier === "low" && "bg-rose-500",
                    )}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <p className="text-sm">
                  {truncateCharacters(result.content, 130)}
                </p>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );

  const renderHealthView = () => (
    <div className="grid md:grid-cols-2 gap-3">
      <div className="rounded-lg border p-3 bg-muted/10">
        <p className="text-xs text-muted-foreground">Near Duplicates</p>
        <p className="text-xl font-semibold">{health.duplicateCount}</p>
        <p className="text-xs text-muted-foreground mt-1">
          candidate pairs with lexical similarity &gt;= 0.90
        </p>
      </div>
      <div className="rounded-lg border p-3 bg-muted/10">
        <p className="text-xs text-muted-foreground">Outlier Chunks</p>
        <p className="text-xl font-semibold">{health.outlierCount}</p>
        <p className="text-xs text-muted-foreground mt-1">
          chunks with weak nearest-neighbor relation
        </p>
      </div>
      <div className="rounded-lg border p-3 bg-muted/10">
        <p className="text-xs text-muted-foreground">Sparse Coverage</p>
        <p className="text-xl font-semibold">{health.sparseCoverageCount}</p>
        <p className="text-xs text-muted-foreground mt-1">
          chunks in low-density regions of the semantic map
        </p>
      </div>
      <div className="rounded-lg border p-3 bg-muted/10">
        <p className="text-xs text-muted-foreground">Source Staleness</p>
        <p className="text-xl font-semibold">{health.staleDays} days</p>
        <p className="text-xs text-muted-foreground mt-1">
          since this source was ingested
        </p>
      </div>

      <div className="md:col-span-2 rounded-lg border p-3">
        <p className="text-sm font-medium">Duplicate Candidates</p>
        <ScrollArea className="h-[170px] mt-2">
          <div className="flex flex-col gap-2 pr-2">
            {analysis.duplicates.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No strong duplicate candidates detected.
              </p>
            )}

            {analysis.duplicates.map((pair, idx) => (
              <button
                type="button"
                key={`${pair.firstId}-${pair.secondId}`}
                className="text-left border rounded-md p-2 hover:bg-muted/30"
                onClick={() => setSelectedChunkId(pair.firstId)}
              >
                <p className="text-xs text-muted-foreground">
                  Pair #{idx + 1} - similarity{" "}
                  {(pair.similarity * 100).toFixed(1)}%
                </p>
                <p className="text-sm truncate">
                  {pair.firstId.slice(0, 8)}... and {pair.secondId.slice(0, 8)}
                  ...
                </p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );

  const renderDetailPanel = () => {
    if (!selectedChunk) {
      return (
        <div className="rounded-lg border p-3 bg-muted/10 min-h-[460px]">
          <p className="text-sm text-muted-foreground">
            Select a chunk from any view to inspect details.
          </p>
        </div>
      );
    }

    return (
      <div className="rounded-lg border p-3 bg-muted/10 min-h-[460px] flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Chunk Detail</p>
            <p className="text-xs text-muted-foreground">
              {getChunkLabel(selectedChunk)}
            </p>
          </div>
          <Badge variant="outline">
            cluster #{selectedChunk.clusterId + 1}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded border p-2">
            <p className="text-muted-foreground">Tokens</p>
            <p className="font-semibold">{selectedChunk.tokenCount}</p>
          </div>
          <div className="rounded border p-2">
            <p className="text-muted-foreground">Keyword Count</p>
            <p className="font-semibold">{selectedChunk.keywordCount}</p>
          </div>
          <div className="rounded border p-2">
            <p className="text-muted-foreground">Nearest Similarity</p>
            <p className="font-semibold">
              {(selectedChunk.maxNeighborScore * 100).toFixed(1)}%
            </p>
          </div>
          <div className="rounded border p-2">
            <p className="text-muted-foreground">Local Density</p>
            <p className="font-semibold">
              {(selectedChunk.denseNeighborRatio * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="rounded border p-2">
          <p className="text-xs text-muted-foreground">Source</p>
          <p className="text-sm">
            {knowledgeBase.fileName ?? "Unknown source"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Projection ({selectedChunk.mapX.toFixed(3)},{" "}
            {selectedChunk.mapY.toFixed(3)})
          </p>
        </div>

        <ScrollArea className="h-[180px] rounded border p-2">
          <p className="text-sm whitespace-pre-wrap">{selectedChunk.content}</p>
        </ScrollArea>

        <div className="rounded border p-2">
          <p className="text-xs text-muted-foreground">
            Find Similar Chunks (local lexical)
          </p>
          <div className="mt-2 flex flex-col gap-1 max-h-[120px] overflow-y-auto pr-1">
            {localSimilarChunks.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No nearby chunks found.
              </p>
            )}

            {localSimilarChunks.map((entry) => (
              <button
                type="button"
                key={entry.chunk.id}
                className="text-left rounded border p-2 hover:bg-muted/30"
                onClick={() => setSelectedChunkId(entry.chunk.id)}
              >
                <p className="text-xs text-muted-foreground">
                  {(entry.score * 100).toFixed(1)}% match
                </p>
                <p className="text-sm">
                  {truncateCharacters(entry.chunk.content, 96)}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (nextOpen) {
          loadChunks();
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[94vw] xl:max-w-7xl">
        <DialogHeader>
          <DialogTitle>
            Chunk Inspector:{" "}
            {truncateCharacters(knowledgeBase.fileName ?? "Knowledgebase", 64)}
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-5 gap-2">
          <div className="rounded-md border bg-muted/20 p-2">
            <p className="text-xs text-muted-foreground">Chunk Count</p>
            <p className="font-semibold">{health.totalChunks}</p>
          </div>
          <div className="rounded-md border bg-muted/20 p-2">
            <p className="text-xs text-muted-foreground">Total Tokens</p>
            <p className="font-semibold">
              {health.totalTokens.toLocaleString()}
            </p>
          </div>
          <div className="rounded-md border bg-muted/20 p-2">
            <p className="text-xs text-muted-foreground">Average Length</p>
            <p className="font-semibold">{health.avgTokens} tokens</p>
          </div>
          <div className="rounded-md border bg-muted/20 p-2">
            <p className="text-xs text-muted-foreground">Very Short (&lt;80)</p>
            <p className="font-semibold">{health.veryShortCount}</p>
          </div>
          <div className="rounded-md border bg-muted/20 p-2">
            <p className="text-xs text-muted-foreground">Long (&gt;900)</p>
            <p className="font-semibold">{health.longCount}</p>
          </div>
        </div>

        {renderLoadingState() ?? (
          <div className="grid lg:grid-cols-12 gap-3 min-h-[560px]">
            <div className="lg:col-span-8 rounded-lg border p-3 bg-background">
              <Tabs defaultValue="map" className="h-full">
                <TabsList className="w-full justify-start overflow-x-auto">
                  <TabsTrigger value="map">
                    <Sparkles className="size-4" />
                    Embedding Map
                  </TabsTrigger>
                  <TabsTrigger value="browser">
                    <Search className="size-4" />
                    Chunk Browser
                  </TabsTrigger>
                  <TabsTrigger value="probe">
                    <Telescope className="size-4" />
                    Query Probe
                  </TabsTrigger>
                  <TabsTrigger value="health">
                    <AlertTriangle className="size-4" />
                    Health Dashboard
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="map" className="pt-3">
                  {renderMapView()}
                </TabsContent>

                <TabsContent
                  value="browser"
                  className="pt-3 flex flex-col gap-2"
                >
                  <div className="flex flex-wrap gap-2">
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by content, token, cluster"
                      className="max-w-sm"
                    />
                    <Button
                      variant={sortBy === "tokens-desc" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSortBy("tokens-desc")}
                    >
                      Tokens desc
                    </Button>
                    <Button
                      variant={sortBy === "tokens-asc" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSortBy("tokens-asc")}
                    >
                      Tokens asc
                    </Button>
                    <Button
                      variant={sortBy === "cluster" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSortBy("cluster")}
                    >
                      Cluster
                    </Button>
                    <Button
                      variant={sortBy === "outliers" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSortBy("outliers")}
                    >
                      Outliers first
                    </Button>
                  </div>
                  {renderBrowserTable()}
                </TabsContent>

                <TabsContent value="probe" className="pt-3">
                  {renderProbeView()}
                </TabsContent>

                <TabsContent value="health" className="pt-3">
                  {renderHealthView()}
                </TabsContent>
              </Tabs>
            </div>

            <div className="lg:col-span-4">{renderDetailPanel()}</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
