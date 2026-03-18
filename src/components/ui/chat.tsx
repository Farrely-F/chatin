"use client";

import { Button } from "@/components/ui/button";
import EditAgentDialog from "@/features/chat-playground/edit-agent-config";
import { cn } from "@/lib/utils";
import { AgentDetails } from "@/service/agents";
import { ModelDetails } from "@/service/model";
import { PersonaDetails } from "@/service/personas";
import { useChat } from "@ai-sdk/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { DefaultChatTransport } from "ai";
import { ArrowLeft, FlaskConical, StopCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Children,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useTransition,
} from "react";
import { useForm } from "react-hook-form";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { z } from "zod/v4";

import { Badge } from "./badge";
import { ChatMessage } from "./chat-message";
import { CodeBlock } from "./code-block";
import { Form, FormField } from "./form";
import { ScrollArea } from "./scroll-area";

const formSchema = z.object({
  message: z.string().trim().min(1),
});

type MessageMetadata = {
  totalUsage?: {
    totalTokens?: number;
  };
};

type RetrievedChunk = {
  id: string;
  content: string;
  similarity: number;
};

type ChatPartLike = {
  type: string;
  state?: string;
  output?: unknown;
};

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
      } satisfies RetrievedChunk;
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
  ).sort((a, b) => b.similarity - a.similarity);

  const averageSimilarity =
    retrievedChunks.length === 0
      ? 0
      : retrievedChunks.reduce((sum, chunk) => sum + chunk.similarity, 0) /
        retrievedChunks.length;

  return {
    retrievalCalls: retrievalParts.length,
    retrievalErrors,
    retrievedChunks,
    averageSimilarity,
    topSimilarity: retrievedChunks[0]?.similarity ?? 0,
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

  const { messages, sendMessage, status, stop } = useChat({
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.handleSubmit(handleMessageSubmit)();
    }
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
          <EditAgentDialog
            models={models}
            personas={personas}
            disabled={isPending}
            agentDetails={agentDetails}
            userId={userId}
          />
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
          {messages.map((msg) => {
            const textPartIndex = msg.parts.findIndex(
              (messagePart) => messagePart.type === "text",
            );
            const retrievalDebug = collectRetrievalDebug(
              msg.parts as ChatPartLike[],
            );
            const messageTokens =
              (msg.metadata as MessageMetadata | undefined)?.totalUsage
                ?.totalTokens ?? 0;

            return msg.parts.map((part, idx) => {
              if (part.type === "text") {
                const confidence = getSimilarityConfidence(
                  retrievalDebug.averageSimilarity,
                );

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
                      <details className="rounded-xl border border-dashed bg-muted/40 p-3 mt-3">
                        <summary className="list-none cursor-pointer">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="secondary">Debug</Badge>
                            <span>Model: {activeModel?.name ?? "unknown"}</span>
                            <span>Tokens: {messageTokens}</span>
                            <span>
                              Retrieval calls: {retrievalDebug.retrievalCalls}
                            </span>
                            <span>
                              Avg similarity:{" "}
                              {formatSimilarity(
                                retrievalDebug.averageSimilarity,
                              )}
                            </span>
                            {retrievalDebug.retrievalCalls > 0 && (
                              <span
                                className={cn("font-medium", confidence.tone)}
                              >
                                Confidence: {confidence.label}
                              </span>
                            )}
                          </div>
                        </summary>

                        <div className="mt-3 grid gap-3">
                          <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                            <div className="rounded-md border bg-background p-2">
                              <p className="text-muted-foreground">
                                Similarity Threshold
                              </p>
                              <p className="font-medium text-foreground">
                                {formatSimilarity(
                                  normalizedSimilarityThreshold,
                                )}
                              </p>
                            </div>
                            <div className="rounded-md border bg-background p-2">
                              <p className="text-muted-foreground">Top K</p>
                              <p className="font-medium text-foreground">
                                {normalizedTopK}
                              </p>
                            </div>
                            <div className="rounded-md border bg-background p-2">
                              <p className="text-muted-foreground">
                                Retrieved Chunks
                              </p>
                              <p className="font-medium text-foreground">
                                {retrievalDebug.retrievedChunks.length}
                              </p>
                            </div>
                            <div className="rounded-md border bg-background p-2">
                              <p className="text-muted-foreground">
                                Top Similarity
                              </p>
                              <p className="font-medium text-foreground">
                                {formatSimilarity(retrievalDebug.topSimilarity)}
                              </p>
                            </div>
                          </div>

                          {retrievalDebug.retrievalErrors > 0 && (
                            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                              {retrievalDebug.retrievalErrors} retrieval tool
                              call
                              {retrievalDebug.retrievalErrors > 1
                                ? "s"
                                : ""}{" "}
                              failed for this response.
                            </p>
                          )}

                          {retrievalDebug.retrievedChunks.length > 0 ? (
                            <ScrollArea className="max-h-72 rounded-md border bg-background p-3">
                              <div className="space-y-3">
                                {retrievalDebug.retrievedChunks
                                  .slice(0, 8)
                                  .map((chunk, chunkIndex) => {
                                    const chunkConfidence =
                                      getSimilarityConfidence(chunk.similarity);

                                    return (
                                      <div
                                        key={chunk.id}
                                        className="rounded-md border bg-muted/30 p-2"
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <p className="text-xs font-medium">
                                            Chunk {chunkIndex + 1}
                                          </p>
                                          <p
                                            className={cn(
                                              "text-xs font-medium",
                                              chunkConfidence.tone,
                                            )}
                                          >
                                            {formatSimilarity(chunk.similarity)}{" "}
                                            • {chunkConfidence.label}
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
                        </div>
                      </details>
                    )}
                  </ChatMessage>
                );
              }

              if (!("toolCallId" in part) || !part.type.startsWith("tool-")) {
                return null;
              }

              const hasTextContent = msg.parts.some(
                (msgPart) =>
                  msgPart.type === "text" && msgPart.text.trim().length > 0,
              );

              if (hasTextContent) {
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
