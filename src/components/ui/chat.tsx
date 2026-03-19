"use client";

import { Button } from "@/components/ui/button";
import EditAgentDialog from "@/features/chat-playground/edit-agent-config";
import { cn } from "@/lib/utils";
import { AgentDetails } from "@/service/agents";
import { ModelDetails } from "@/service/model";
import { PersonaDetails } from "@/service/personas";
import { useChat } from "@ai-sdk/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  ArrowLeft,
  CheckCircle2,
  EllipsisVertical,
  FileDown,
  FileUp,
  FlaskConical,
  Send,
  StopCircle,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Children,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useForm } from "react-hook-form";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { z } from "zod/v4";

import { Badge } from "./badge";
import { submitPlaygroundFeedbackAction } from "./chat-feedback-actions";
import { ChatMessage } from "./chat-message";
import { CodeBlock } from "./code-block";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Form, FormField } from "./form";
import { ScrollArea } from "./scroll-area";

const formSchema = z.object({
  message: z.string().trim().min(1),
});

const importChatPartSchema = z.looseObject({
  type: z.string(),
});

const importChatMessageSchema = z.looseObject({
  id: z.string().optional(),
  role: z.enum(["system", "user", "assistant"]),
  parts: z.array(importChatPartSchema),
  metadata: z.unknown().optional(),
});

const importConversationSchema = z.union([
  z.array(importChatMessageSchema),
  z.looseObject({
    messages: z.array(importChatMessageSchema),
  }),
]);

type MessageMetadata = {
  totalUsage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    cachedInputTokens?: number;
  };
  cache?: {
    inputTokens?: number;
    cachedInputTokens?: number;
    hitRate?: number;
  };
  embeddingCache?: {
    hitRate?: number;
    size?: number;
  };
};

type RetrievedChunk = {
  id: string;
  content: string;
  similarity: number;
  hybridScore?: number;
  bm25Score?: number;
  expansionTerms?: string[];
  usedQueryExpansion?: boolean;
};

type ChatPartLike = {
  type: string;
  state?: string;
  output?: unknown;
  text?: string;
  toolCallId?: string;
};

type FeedbackDraft = {
  isHelpful: boolean | null;
  expectedResponse: string;
  feedbackNote: string;
  isSubmitting: boolean;
  isSubmitted: boolean;
};

type FeedbackPayload = {
  assistantMessageId: string;
  isHelpful: boolean;
  userQuestion: string;
  agentResponse: string;
  expectedResponse?: string;
  feedbackNote?: string;
};

function createImportedMessageId(index: number) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `imported-${crypto.randomUUID()}`;
  }

  return `imported-${Date.now()}-${index}`;
}

function getImportedMessages(payload: unknown): UIMessage[] {
  const parsedPayload = importConversationSchema.parse(payload);
  const messages = Array.isArray(parsedPayload)
    ? parsedPayload
    : parsedPayload.messages;

  return messages.map((message, index) => ({
    ...message,
    id: message.id?.trim() || createImportedMessageId(index),
  })) as UIMessage[];
}

function sanitizeFilenameSegment(value: string) {
  const normalized = value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");

  return normalized || "chat";
}

function normalizeRetrievedChunks(output: unknown): RetrievedChunk[] {
  if (!Array.isArray(output)) {
    return [];
  }

  return output
    .map((chunk) => {
      if (!chunk || typeof chunk !== "object") {
        return null;
      }

      const candidate = chunk as Partial<RetrievedChunk>;

      if (
        typeof candidate.id !== "string" ||
        typeof candidate.content !== "string" ||
        typeof candidate.similarity !== "number"
      ) {
        return null;
      }

      return {
        id: candidate.id,
        content: candidate.content,
        similarity: Math.min(1, Math.max(0, candidate.similarity)),
        ...(candidate.hybridScore !== undefined && {
          hybridScore: candidate.hybridScore,
        }),
        ...(candidate.bm25Score !== undefined && {
          bm25Score: candidate.bm25Score,
        }),
        ...(candidate.expansionTerms !== undefined && {
          expansionTerms: candidate.expansionTerms,
        }),
        ...(candidate.usedQueryExpansion !== undefined && {
          usedQueryExpansion: candidate.usedQueryExpansion,
        }),
      } as RetrievedChunk;
    })
    .filter((chunk): chunk is RetrievedChunk => chunk !== null)
    .sort((a, b) => b.similarity - a.similarity);
}

function getSimilarityConfidence(similarity: number) {
  if (similarity >= 0.85) {
    return { label: "High", tone: "text-emerald-600" };
  }

  if (similarity >= 0.7) {
    return { label: "Moderate", tone: "text-sky-600" };
  }

  if (similarity >= 0.55) {
    return { label: "Low", tone: "text-amber-600" };
  }

  return { label: "Very Low", tone: "text-rose-600" };
}

function formatSimilarity(similarity: number) {
  return `${(similarity * 100).toFixed(1)}%`;
}

function collectRetrievalDebug(parts: ChatPartLike[]) {
  const retrievalParts = parts.filter(
    (part) => part.type === "tool-retrieve_context",
  );

  const retrievalErrors = retrievalParts.filter(
    (part) => part.state === "output-error",
  ).length;

  const retrievedChunks = Array.from(
    new Map(
      retrievalParts
        .flatMap((part) => normalizeRetrievedChunks(part.output))
        .map((chunk) => [chunk.id, chunk]),
    ).values(),
  ).sort((a, b) => {
    const scoreA = a.hybridScore ?? a.similarity;
    const scoreB = b.hybridScore ?? b.similarity;
    return scoreB - scoreA;
  });

  const useHybridScores = retrievedChunks.some(
    (c) => c.hybridScore !== undefined,
  );

  const averageSimilarity =
    retrievedChunks.length === 0
      ? 0
      : retrievedChunks.reduce((sum, chunk) => sum + chunk.similarity, 0) /
        retrievedChunks.length;

  const averageHybridScore =
    retrievedChunks.length === 0 || !useHybridScores
      ? undefined
      : retrievedChunks.reduce(
          (sum, chunk) => sum + (chunk.hybridScore ?? 0),
          0,
        ) / retrievedChunks.length;

  return {
    retrievalCalls: retrievalParts.length,
    retrievalErrors,
    retrievedChunks,
    averageSimilarity,
    averageHybridScore,
    topSimilarity: retrievedChunks[0]?.similarity ?? 0,
    topHybridScore:
      retrievedChunks[0]?.hybridScore ?? retrievedChunks[0]?.similarity ?? 0,
    useHybridScores,
    expansionTerms: retrievedChunks[0]?.expansionTerms,
    usedQueryExpansion: retrievedChunks[0]?.usedQueryExpansion ?? false,
  };
}

function getCodeText(children: ReactNode) {
  return Children.toArray(children)
    .map((child) =>
      typeof child === "string" || typeof child === "number"
        ? String(child)
        : "",
    )
    .join("");
}

function extractTextFromParts(parts: ChatPartLike[]) {
  return parts
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text?.trim() || "")
    .filter((text) => text.length > 0)
    .join("\n\n");
}

function hasTextContent(parts: ChatPartLike[]) {
  return parts.some(
    (part) =>
      (part.type === "text" || part.type === "reasoning") &&
      (part.text?.trim().length ?? 0) > 0,
  );
}

function isToolCallPart(part: ChatPartLike) {
  return Boolean(part.toolCallId) && part.type.startsWith("tool-");
}

const markdownComponents = {
  code({ className, children, ...props }: React.ComponentProps<"code">) {
    const match = /language-(\w+)/.exec(className || "");
    const codeText = getCodeText(children);

    return match ? (
      <CodeBlock language={match[1]} value={codeText.replace(/\n$/, "")} />
    ) : (
      <code className="px-1.5 py-0.5 rounded bg-muted text-sm" {...props}>
        {children}
      </code>
    );
  },
};

type AssistantResponseInspectorProps = Readonly<{
  activeModelName?: string;
  messageTokens: number;
  messageInputTokens: number;
  messageCachedInputTokens: number;
  messageCacheHitRate?: number;
  embeddingCacheHitRate?: number;
  embeddingCacheSize?: number;
  retrievalDebug: ReturnType<typeof collectRetrievalDebug>;
  normalizedSimilarityThreshold: number;
  normalizedTopK: number;
  assistantResponseText: string;
  feedbackDraft: FeedbackDraft;
  onHelpful: () => void;
  onNeedsCorrection: () => void;
  onExpectedResponseChange: (value: string) => void;
  onFeedbackNoteChange: (value: string) => void;
  onSubmitCorrection: () => void;
}>;

function AssistantResponseInspector({
  activeModelName,
  messageTokens,
  messageInputTokens,
  messageCachedInputTokens,
  messageCacheHitRate,
  embeddingCacheHitRate,
  embeddingCacheSize,
  retrievalDebug,
  normalizedSimilarityThreshold,
  normalizedTopK,
  assistantResponseText,
  feedbackDraft,
  onHelpful,
  onNeedsCorrection,
  onExpectedResponseChange,
  onFeedbackNoteChange,
  onSubmitCorrection,
}: AssistantResponseInspectorProps) {
  const scoreForConfidence = retrievalDebug.useHybridScores
    ? (retrievalDebug.averageHybridScore ?? retrievalDebug.averageSimilarity)
    : retrievalDebug.averageSimilarity;
  const confidence = getSimilarityConfidence(scoreForConfidence ?? 0);

  return (
    <details className="rounded-xl border border-dashed bg-muted/40 p-3 mt-3">
      <summary className="list-none cursor-pointer">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">Debug</Badge>
          <span>Model: {activeModelName ?? "unknown"}</span>
          <span>Tokens: {messageTokens}</span>
          {messageInputTokens > 0 && (
            <span>
              Cached prompt: {messageCachedInputTokens}/{messageInputTokens}
            </span>
          )}
          {messageCacheHitRate !== undefined && (
            <span>Cache hit: {formatSimilarity(messageCacheHitRate)}</span>
          )}
          <span>Retrieval calls: {retrievalDebug.retrievalCalls}</span>
          {retrievalDebug.useHybridScores ? (
            <>
              <span>
                Avg hybrid:{" "}
                {formatSimilarity(retrievalDebug.averageHybridScore ?? 0)}
              </span>
              <span className="text-muted-foreground/70">
                (vec: {formatSimilarity(retrievalDebug.averageSimilarity)})
              </span>
            </>
          ) : (
            <span>
              Avg similarity:{" "}
              {formatSimilarity(retrievalDebug.averageSimilarity)}
            </span>
          )}
          {retrievalDebug.retrievalCalls > 0 && (
            <span className={cn("font-medium", confidence.tone)}>
              Confidence: {confidence.label}
            </span>
          )}
          {retrievalDebug.usedQueryExpansion && (
            <span className="text-emerald-600/70">
              QE:{" "}
              {retrievalDebug.expansionTerms &&
              retrievalDebug.expansionTerms.length > 0
                ? `+${retrievalDebug.expansionTerms.join(", ")}`
                : "no terms"}
            </span>
          )}
        </div>
      </summary>

      <div className="mt-3 grid gap-3">
        <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-6">
          <div className="rounded-md border bg-background p-2">
            <p className="text-muted-foreground">Similarity Threshold</p>
            <p className="font-medium text-foreground">
              {formatSimilarity(normalizedSimilarityThreshold)}
            </p>
          </div>
          <div className="rounded-md border bg-background p-2">
            <p className="text-muted-foreground">Top K</p>
            <p className="font-medium text-foreground">{normalizedTopK}</p>
          </div>
          <div className="rounded-md border bg-background p-2">
            <p className="text-muted-foreground">Prompt Tokens</p>
            <p className="font-medium text-foreground">{messageInputTokens}</p>
          </div>
          <div className="rounded-md border bg-background p-2">
            <p className="text-muted-foreground">Cached Prompt Tokens</p>
            <p className="font-medium text-foreground">
              {messageCachedInputTokens}
            </p>
          </div>
          <div className="rounded-md border bg-background p-2">
            <p className="text-muted-foreground">Cache Hit Rate</p>
            <p className="font-medium text-foreground">
              {messageCacheHitRate === undefined
                ? "n/a"
                : formatSimilarity(messageCacheHitRate)}
            </p>
          </div>
          <div className="rounded-md border bg-background p-2">
            <p className="text-muted-foreground">Retrieved Chunks</p>
            <p className="font-medium text-foreground">
              {retrievalDebug.retrievedChunks.length}
            </p>
          </div>
          {retrievalDebug.useHybridScores ? (
            <>
              <div className="rounded-md border bg-background p-2">
                <p className="text-muted-foreground">Top Hybrid</p>
                <p className="font-medium text-foreground">
                  {formatSimilarity(retrievalDebug.topHybridScore)}
                </p>
              </div>
              <div className="rounded-md border bg-background p-2">
                <p className="text-muted-foreground">Top BM25</p>
                <p className="font-medium text-foreground">
                  {retrievalDebug.retrievedChunks[0]?.bm25Score !== undefined
                    ? formatSimilarity(
                        retrievalDebug.retrievedChunks[0].bm25Score,
                      )
                    : "n/a"}
                </p>
              </div>
            </>
          ) : (
            <div className="rounded-md border bg-background p-2">
              <p className="text-muted-foreground">Top Similarity</p>
              <p className="font-medium text-foreground">
                {formatSimilarity(retrievalDebug.topSimilarity)}
              </p>
            </div>
          )}
          {embeddingCacheHitRate !== undefined && (
            <div className="rounded-md border bg-background p-2">
              <p className="text-muted-foreground">Embed Cache</p>
              <p className="font-medium text-foreground">
                {formatSimilarity(embeddingCacheHitRate)} ({embeddingCacheSize})
              </p>
            </div>
          )}
        </div>

        {retrievalDebug.retrievalErrors > 0 && (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {retrievalDebug.retrievalErrors} retrieval tool call
            {retrievalDebug.retrievalErrors > 1 ? "s" : ""} failed for this
            response.
          </p>
        )}

        {retrievalDebug.retrievedChunks.length > 0 ? (
          <ScrollArea className="max-h-72 rounded-md border bg-background p-3">
            <div className="space-y-3">
              {retrievalDebug.retrievedChunks
                .slice(0, 8)
                .map((chunk, index) => {
                  const chunkConfidence = getSimilarityConfidence(
                    chunk.similarity,
                  );

                  return (
                    <div
                      key={chunk.id}
                      className="rounded-md border bg-muted/30 p-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium">Chunk {index + 1}</p>
                        <p
                          className={cn(
                            "text-xs font-medium",
                            chunkConfidence.tone,
                          )}
                        >
                          {formatSimilarity(chunk.similarity)} •{" "}
                          {chunkConfidence.label}
                        </p>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                        {chunk.content}
                      </p>
                    </div>
                  );
                })}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-xs text-muted-foreground">
            No embedding chunks were returned for this reply.
          </p>
        )}

        {assistantResponseText && (
          <div className="rounded-md border bg-background p-3">
            {feedbackDraft.isSubmitted ? (
              <p className="flex items-center gap-2 text-xs text-emerald-700">
                <CheckCircle2 className="size-4" />
                Feedback recorded. Thanks, this will guide future responses.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Is this response aligned with your expected answer?
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      feedbackDraft.isHelpful === true ? "default" : "outline"
                    }
                    disabled={feedbackDraft.isSubmitting}
                    onClick={onHelpful}
                  >
                    <ThumbsUp />
                    Helpful
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      feedbackDraft.isHelpful === false ? "default" : "outline"
                    }
                    disabled={feedbackDraft.isSubmitting}
                    onClick={onNeedsCorrection}
                  >
                    <ThumbsDown />
                    Needs Correction
                  </Button>
                </div>

                {feedbackDraft.isHelpful === false && (
                  <div className="space-y-2">
                    <textarea
                      value={feedbackDraft.expectedResponse}
                      className="min-h-20 w-full rounded-md border bg-background p-2 text-xs"
                      placeholder="Write the expected response, e.g. Biz Lite from Biz Manufacture category..."
                      onChange={(event) =>
                        onExpectedResponseChange(event.target.value)
                      }
                    />
                    <textarea
                      value={feedbackDraft.feedbackNote}
                      className="min-h-16 w-full rounded-md border bg-background p-2 text-xs"
                      placeholder="Optional note about why this response was not correct"
                      onChange={(event) =>
                        onFeedbackNoteChange(event.target.value)
                      }
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={feedbackDraft.isSubmitting}
                      onClick={onSubmitCorrection}
                    >
                      <Send />
                      Submit Feedback
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </details>
  );
}

type ChatProps = Readonly<{
  agentDetails: AgentDetails;
  models: ModelDetails[];
  personas: PersonaDetails[];
  userId: string;
}>;

export default function Chat({
  agentDetails,
  models,
  personas,
  userId,
}: ChatProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const [feedbackDrafts, setFeedbackDrafts] = useState<
    Record<string, FeedbackDraft>
  >({});

  const activeModel =
    models.find((model) => model.id === agentDetails.modelId) ?? null;

  const normalizedTopK = Math.max(1, Math.floor(agentDetails.topK ?? 5));
  const normalizedSimilarityThreshold = Math.min(
    1,
    Math.max(0, agentDetails.similarityThreshold ?? 0.5),
  );

  const form = useForm<
    z.input<typeof formSchema>,
    unknown,
    z.output<typeof formSchema>
  >({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    onError(error) {
      toast.error(error instanceof Error ? error.message : error);
    },

    transport: new DefaultChatTransport({
      api: `/api/v1/agents/${agentDetails.id}/playground`,
      body: {
        user_id: userId,
      },
    }),
  });

  const usedToken = useMemo(
    () =>
      messages.reduce((sum, message) => {
        if (message.role !== "assistant") {
          return sum;
        }

        const tokenCount =
          (message.metadata as MessageMetadata | undefined)?.totalUsage
            ?.totalTokens ?? 0;

        return sum + tokenCount;
      }, 0),
    [messages],
  );

  const cacheUsageSummary = useMemo(
    () =>
      messages.reduce(
        (summary, message) => {
          if (message.role !== "assistant") {
            return summary;
          }

          const metadata = message.metadata as MessageMetadata | undefined;
          const inputTokens =
            metadata?.cache?.inputTokens ??
            metadata?.totalUsage?.inputTokens ??
            0;
          const cachedInputTokens =
            metadata?.cache?.cachedInputTokens ??
            metadata?.totalUsage?.cachedInputTokens ??
            0;

          return {
            inputTokens: summary.inputTokens + inputTokens,
            cachedInputTokens: summary.cachedInputTokens + cachedInputTokens,
          };
        },
        {
          inputTokens: 0,
          cachedInputTokens: 0,
        },
      ),
    [messages],
  );

  const cacheHitRate =
    cacheUsageSummary.inputTokens > 0
      ? cacheUsageSummary.cachedInputTokens / cacheUsageSummary.inputTokens
      : undefined;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleMessageSubmit = () => {
    const message = form.getValues("message").trim();
    if (!message) {
      return;
    }

    form.reset({
      message: "",
    });

    startTransition(() => {
      sendMessage({ text: message }).catch((error) => {
        toast.error(error instanceof Error ? error.message : String(error));
      });
    });
  };

  const handleExportConversation = () => {
    if (messages.length === 0) {
      toast.error("No conversation available to export");
      return;
    }

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      agentId: agentDetails.id,
      agentName: agentDetails.name,
      messages,
    };

    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileDate = new Date().toISOString().slice(0, 10);
    const fileBaseName = sanitizeFilenameSegment(agentDetails.name);

    link.href = url;
    link.download = `${fileBaseName}-playground-chat-${fileDate}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    toast.success("Conversation exported as JSON");
  };

  const openImportConversationPicker = () => {
    if (status === "streaming") {
      stop();
    }

    importFileInputRef.current?.click();
  };

  const handleImportConversation = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile) {
      return;
    }

    try {
      const content = await selectedFile.text();
      const parsed = JSON.parse(content);
      const importedMessages = getImportedMessages(parsed);

      if (importedMessages.length === 0) {
        toast.error("No messages found in the imported file");
        return;
      }

      setMessages(importedMessages);
      setFeedbackDrafts({});
      toast.success(`Imported ${importedMessages.length} message(s)`);
    } catch (error) {
      let message = "Failed to import conversation";

      if (error instanceof z.ZodError) {
        message = "Invalid conversation format in JSON file";
      } else if (error instanceof Error) {
        message = error.message;
      }

      toast.error(message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.handleSubmit(handleMessageSubmit)();
    }
  };

  const updateFeedbackDraft = (
    messageId: string,
    updater: (prev: FeedbackDraft) => FeedbackDraft,
  ) => {
    setFeedbackDrafts((prev) => {
      const current =
        prev[messageId] ||
        ({
          isHelpful: null,
          expectedResponse: "",
          feedbackNote: "",
          isSubmitting: false,
          isSubmitted: false,
        } satisfies FeedbackDraft);

      return {
        ...prev,
        [messageId]: updater(current),
      };
    });
  };

  const submitResponseFeedback = async (payload: FeedbackPayload) => {
    updateFeedbackDraft(payload.assistantMessageId, (prev) => ({
      ...prev,
      isSubmitting: true,
      isHelpful: payload.isHelpful,
    }));

    try {
      const result = await submitPlaygroundFeedbackAction({
        agentId: agentDetails.id,
        ...payload,
      });

      if (!result.status) {
        throw new Error(result.error || "Failed to submit feedback");
      }

      updateFeedbackDraft(payload.assistantMessageId, (prev) => ({
        ...prev,
        isSubmitting: false,
        isSubmitted: true,
      }));

      toast.success(
        "Feedback saved. Future replies will follow your guidance.",
      );
    } catch (error) {
      updateFeedbackDraft(payload.assistantMessageId, (prev) => ({
        ...prev,
        isSubmitting: false,
      }));

      toast.error(error instanceof Error ? error.message : "Feedback failed");
    }
  };

  const setNeedsCorrection = (messageId: string) => {
    updateFeedbackDraft(messageId, (prev) => ({
      ...prev,
      isHelpful: false,
    }));
  };

  const setExpectedResponseDraft = (messageId: string, value: string) => {
    updateFeedbackDraft(messageId, (prev) => ({
      ...prev,
      expectedResponse: value,
    }));
  };

  const setFeedbackNoteDraft = (messageId: string, value: string) => {
    updateFeedbackDraft(messageId, (prev) => ({
      ...prev,
      feedbackNote: value,
    }));
  };

  const submitHelpfulFeedback = (
    messageId: string,
    userQuestion: string,
    agentResponse: string,
  ) => {
    void submitResponseFeedback({
      assistantMessageId: messageId,
      isHelpful: true,
      userQuestion,
      agentResponse,
    });
  };

  const submitCorrectiveFeedback = (
    messageId: string,
    userQuestion: string,
    agentResponse: string,
    draft: FeedbackDraft,
  ) => {
    if (!draft.expectedResponse.trim()) {
      toast.error("Expected response is required");
      return;
    }

    void submitResponseFeedback({
      assistantMessageId: messageId,
      isHelpful: false,
      userQuestion,
      agentResponse,
      expectedResponse: draft.expectedResponse,
      feedbackNote: draft.feedbackNote,
    });
  };

  const lastAssistantDebug = [...messages]
    .reverse()
    .filter((message) => message.role === "assistant")
    .map((message) => {
      const debug = collectRetrievalDebug(message.parts as ChatPartLike[]);
      return {
        ...debug,
        tokens:
          (message.metadata as MessageMetadata | undefined)?.totalUsage
            ?.totalTokens ?? 0,
      };
    })
    .find((summary) => summary.retrievalCalls > 0 || summary.tokens > 0);

  return (
    <>
      {/* Header */}
      <div className="py-5 bg-background sticky top-0 z-10 before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-gradient-to-r before:from-black/[0.06] before:via-black/10 before:to-black/[0.06]">
        <div className="flex max-w-5xl mx-auto items-center justify-between gap-2 px-2">
          <div className="flex items-center gap-1">
            <Button
              variant={"ghost"}
              size={"icon"}
              onClick={() => router.back()}
            >
              <ArrowLeft className="text-muted-foreground size-5" />
            </Button>
            <h1>{agentDetails.name} Playground</h1>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={importFileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportConversation}
            />
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline">
                  <EllipsisVertical className="size-4" />
                  Conversation
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    disabled={isPending || messages.length === 0}
                    onSelect={handleExportConversation}
                  >
                    <FileDown className="size-4" />
                    Export JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={isPending}
                    onSelect={openImportConversationPicker}
                  >
                    <FileUp className="size-4" />
                    Import JSON
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <EditAgentDialog
              models={models}
              personas={personas}
              disabled={isPending}
              agentDetails={agentDetails}
              userId={userId}
            />
          </div>
        </div>
      </div>
      <div className="sticky top-[76px] z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 border-b">
        <div className="max-w-5xl mx-auto px-2 py-2">
          <div className="rounded-lg border bg-muted px-3 py-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <FlaskConical className="size-4" />
              <span className="font-medium text-foreground">
                {usedToken} tokens used
              </span>
              <span>
                {activeModel
                  ? `${activeModel.provider} • ${activeModel.name}`
                  : "Model unavailable"}
              </span>
              <span>
                Threshold {formatSimilarity(normalizedSimilarityThreshold)} •
                Top K {normalizedTopK}
              </span>
              {cacheUsageSummary.inputTokens > 0 && (
                <span>
                  Prompt cache: {cacheUsageSummary.cachedInputTokens}/
                  {cacheUsageSummary.inputTokens} tokens
                  {cacheHitRate === undefined
                    ? ""
                    : ` (${formatSimilarity(cacheHitRate)} hit rate)`}
                </span>
              )}
              {lastAssistantDebug && (
                <span>
                  Last response: {lastAssistantDebug.retrievalCalls} retrieval
                  call(s), {lastAssistantDebug.retrievedChunks.length} chunk(s)
                  {lastAssistantDebug.retrievalCalls > 0 &&
                    `, avg ${formatSimilarity(lastAssistantDebug.averageSimilarity)}`}
                  .
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Chat */}
      <div className="relative grow">
        <div className="max-w-5xl mx-auto mt-6 space-y-6 space-x-2 px-2">
          {messages.map((msg, messageIndex) => {
            const textPartIndex = msg.parts.findIndex(
              (messagePart) => messagePart.type === "text",
            );
            const retrievalDebug = collectRetrievalDebug(
              msg.parts as ChatPartLike[],
            );
            const assistantResponseText = extractTextFromParts(
              msg.parts as ChatPartLike[],
            );
            const previousUserMessage = [...messages]
              .slice(0, messageIndex)
              .reverse()
              .find((message) => message.role === "user");
            const userQuestion = previousUserMessage
              ? extractTextFromParts(
                  previousUserMessage.parts as ChatPartLike[],
                )
              : "";

            const feedbackDraft =
              feedbackDrafts[msg.id] ||
              ({
                isHelpful: null,
                expectedResponse: "",
                feedbackNote: "",
                isSubmitting: false,
                isSubmitted: false,
              } satisfies FeedbackDraft);
            const messageMetadata = msg.metadata as MessageMetadata | undefined;
            const messageTokens = messageMetadata?.totalUsage?.totalTokens ?? 0;
            const messageInputTokens =
              messageMetadata?.cache?.inputTokens ??
              messageMetadata?.totalUsage?.inputTokens ??
              0;
            const messageCachedInputTokens =
              messageMetadata?.cache?.cachedInputTokens ??
              messageMetadata?.totalUsage?.cachedInputTokens ??
              0;
            const messageCacheHitRate =
              messageMetadata?.cache?.hitRate ??
              (messageInputTokens > 0
                ? messageCachedInputTokens / messageInputTokens
                : undefined);

            return (msg.parts as ChatPartLike[]).map((part, idx) => {
              if (part.type === "text") {
                return (
                  <ChatMessage
                    agentName={agentDetails.name}
                    className="group"
                    isUser={msg.role === "user"}
                    key={`${msg.id}-${idx}`}
                  >
                    <ReactMarkdown components={markdownComponents}>
                      {part.text}
                    </ReactMarkdown>

                    {msg.role === "assistant" && idx === textPartIndex && (
                      <AssistantResponseInspector
                        activeModelName={activeModel?.name}
                        messageTokens={messageTokens}
                        messageInputTokens={messageInputTokens}
                        messageCachedInputTokens={messageCachedInputTokens}
                        messageCacheHitRate={messageCacheHitRate}
                        embeddingCacheHitRate={
                          messageMetadata?.embeddingCache?.hitRate
                        }
                        embeddingCacheSize={
                          messageMetadata?.embeddingCache?.size
                        }
                        retrievalDebug={retrievalDebug}
                        normalizedSimilarityThreshold={
                          normalizedSimilarityThreshold
                        }
                        normalizedTopK={normalizedTopK}
                        assistantResponseText={assistantResponseText}
                        feedbackDraft={feedbackDraft}
                        onHelpful={() =>
                          submitHelpfulFeedback(
                            msg.id,
                            userQuestion,
                            assistantResponseText,
                          )
                        }
                        onNeedsCorrection={() => setNeedsCorrection(msg.id)}
                        onExpectedResponseChange={(value) =>
                          setExpectedResponseDraft(msg.id, value)
                        }
                        onFeedbackNoteChange={(value) =>
                          setFeedbackNoteDraft(msg.id, value)
                        }
                        onSubmitCorrection={() =>
                          submitCorrectiveFeedback(
                            msg.id,
                            userQuestion,
                            assistantResponseText,
                            feedbackDraft,
                          )
                        }
                      />
                    )}
                  </ChatMessage>
                );
              }

              if (part.type === "reasoning") {
                const reasoningText = part.text?.trim() || "";

                if (!reasoningText) {
                  return null;
                }

                return (
                  <ChatMessage
                    agentName={agentDetails.name}
                    className="group"
                    isUser={false}
                    key={`${msg.id}-${idx}`}
                  >
                    <details
                      className="rounded-xl border border-dashed bg-muted/40 px-3 py-2"
                      open={part.state === "streaming"}
                    >
                      <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                        {part.state === "streaming"
                          ? "Thinking..."
                          : "Thinking"}
                      </summary>
                      <div className="mt-2 text-sm text-muted-foreground">
                        <ReactMarkdown components={markdownComponents}>
                          {reasoningText}
                        </ReactMarkdown>
                      </div>
                    </details>
                  </ChatMessage>
                );
              }

              if (!isToolCallPart(part)) {
                return null;
              }

              if (hasTextContent(msg.parts as ChatPartLike[])) {
                return null;
              }

              const toolName = part.type.slice(5).split("_").join(" ");
              const toolLabel =
                part.state === "output-error" ? `${toolName} failed` : toolName;

              return (
                <Badge
                  variant={"secondary"}
                  key={part.toolCallId}
                  className="italic"
                >
                  🛠️ {toolLabel}
                </Badge>
              );
            });
          })}

          {status !== "ready" &&
            status !== "error" &&
            status !== "streaming" && (
              <ChatMessage isUser={false}>
                <div className="flex items-center space-x-2">
                  <div className="animate-pulse rounded-lg bg-muted w-24 h-4" />
                  <div className="animate-pulse rounded-lg bg-muted w-16 h-4" />
                  <div className="animate-pulse rounded-lg bg-muted w-20 h-4" />
                </div>
              </ChatMessage>
            )}
          <div ref={messagesEndRef} aria-hidden="true" />
        </div>
      </div>
      {/* Footer */}
      <div className="sticky bottom-0 pt-4 md:pt-8 z-50">
        <div className="max-w-5xl mx-auto bg-background rounded-[20px] pb-4 md:pb-8 px-2">
          <div className="relative rounded-[20px] border border-transparent bg-muted transition-colors focus-within:bg-muted/50 focus-within:border-input has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 [&:has(input:is(:disabled))_*]:pointer-events-none">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleMessageSubmit)}>
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <textarea
                      {...field}
                      className="flex sm:min-h-[84px] w-full bg-transparent px-4 py-3 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none [resize:none]"
                      placeholder="Ask me anything..."
                      aria-label="Enter your prompt"
                      onKeyDown={handleKeyDown}
                    />
                  )}
                />
                <div className="flex items-center justify-end gap-2 p-3">
                  <Button
                    type={status === "streaming" ? "button" : "submit"}
                    variant="gradient"
                    className={`rounded-full h-8 ${
                      status === "streaming" ? "animate-pulse" : ""
                    }`}
                    onClick={() => (status === "ready" ? null : stop())}
                  >
                    {status === "streaming" ? (
                      <>
                        <StopCircle />
                        Stop
                      </>
                    ) : (
                      "Submit"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </>
  );
}
