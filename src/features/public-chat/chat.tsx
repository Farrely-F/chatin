"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { CopyButton } from "@/components/ui/copy-button";
import { useChatStore } from "@/lib/chat-store";
import { cn } from "@/lib/utils";
import { AgentDetails } from "@/service/agents";
import { useChat } from "@ai-sdk/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { DefaultChatTransport, type UIMessage } from "ai";
import { StopCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import {
  Children,
  type ComponentProps,
  type ReactNode,
  useEffect,
  useRef,
  useTransition,
} from "react";
import { useForm } from "react-hook-form";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { z } from "zod/v4";

import { ChatMessage } from "../../components/ui/chat-message";
import { Form, FormField } from "../../components/ui/form";

const ChatDisclaimer = dynamic(() => import("./chat-disclaimer"), {
  ssr: false,
});

const formSchema = z.object({
  message: z.string().trim().min(1),
});

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
  code({ className, children, ...props }: ComponentProps<"code">) {
    const match = /language-(\w+)/.exec(className || "");
    const codeText = getCodeText(children);

    return match ? (
      <CodeBlock language={match[1]} value={codeText.replace(/\n$/, "")} />
    ) : (
      <pre className="w-full overflow-x-auto">
        <code className="px-1.5 py-0.5 rounded bg-muted text-sm" {...props}>
          {children}
        </code>
      </pre>
    );
  },
  table({ className, children, ...props }: ComponentProps<"table">) {
    return (
      <div className="my-3 w-full overflow-x-auto rounded-lg border border-border bg-background">
        <table
          className={cn("w-full min-w-max border-collapse text-sm", className)}
          {...props}
        >
          {children}
        </table>
      </div>
    );
  },
  thead({ className, children, ...props }: ComponentProps<"thead">) {
    return (
      <thead className={cn("bg-muted/60", className)} {...props}>
        {children}
      </thead>
    );
  },
  tr({ className, children, ...props }: ComponentProps<"tr">) {
    return (
      <tr className={cn("border-b border-border", className)} {...props}>
        {children}
      </tr>
    );
  },
  th({ className, children, ...props }: ComponentProps<"th">) {
    return (
      <th
        className={cn(
          "border-r border-border px-3 py-2 text-left text-xs font-semibold text-foreground last:border-r-0",
          className,
        )}
        {...props}
      >
        {children}
      </th>
    );
  },
  td({ className, children, ...props }: ComponentProps<"td">) {
    return (
      <td
        className={cn(
          "border-r border-border px-3 py-2 align-top text-sm text-muted-foreground last:border-r-0",
          className,
        )}
        {...props}
      >
        {children}
      </td>
    );
  },
};

export default function Chat({
  agentDetails,
}: Readonly<{ agentDetails: AgentDetails }>) {
  const [, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageHistoryRef = useRef<UIMessage[]>([]);

  const params = useParams();
  const { slug, chatId } = params as { slug: string; chatId: string };

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

  const { saveChatHistory, loadChatHistory, saveChatList, getChatList } =
    useChatStore();

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    onFinish: ({ messages: nextMessages }) => {
      messageHistoryRef.current = nextMessages;
      saveChatHistory(slug, chatId, nextMessages);
    },

    onError(error) {
      toast.error(error instanceof Error ? error.message : error);
    },

    transport: new DefaultChatTransport({
      api: `/api/v1/agents/${agentDetails.id}/public/chat/stream`,
      body: {
        user_id: agentDetails?.userId,
      },
    }),
  });

  useEffect(() => {
    const stored = loadChatHistory(slug, chatId);
    if (stored.length > 0) {
      messageHistoryRef.current = stored;
      setMessages(stored);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, chatId]);

  // Auto scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleMessageSubmit = () => {
    const message = form.getValues("message").trim();
    if (!message) {
      return;
    }

    startTransition(() => {
      if (messageHistoryRef.current.length === 0) {
        const chatList = getChatList(slug);
        const firstMessageTitle = message.slice(0, 40);
        const metadata = {
          chatId,
          slug,
          title: firstMessageTitle || "Untitled chat",
          createdAt: new Date().toISOString(),
        };
        saveChatList(slug, [metadata, ...chatList]);
      }

      sendMessage({ text: message }).catch((error) => {
        toast.error(error instanceof Error ? error.message : String(error));
      });
      form.reset({ message: "" });
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.handleSubmit(handleMessageSubmit)();
    }
  };

  return (
    <>
      {/* Chat Content */}
      <div className="relative grow">
        <div className="max-w-3xl mx-auto mt-6 space-y-6 space-x-2">
          {messages.map((msg) => {
            return msg.parts.map((part, idx) => {
              if (part.type === "text") {
                return (
                  <ChatMessage
                    agentName={agentDetails.name}
                    className="group"
                    isUser={msg.role === "user"}
                    key={`${msg.id}-${idx}`}
                    messageActions={
                      <div className="flex items-center gap-2 text-muted-foreground text-xs group-hover:scale-100 scale-0 transition-transform ease-in-out origin-left">
                        <CopyButton value={part.text} />
                        <p>Copy Message</p>
                      </div>
                    }
                  >
                    <ReactMarkdown
                      components={markdownComponents}
                      remarkPlugins={[remarkGfm]}
                    >
                      {part.text}
                    </ReactMarkdown>
                  </ChatMessage>
                );
              }

              if (part.type === "reasoning") {
                if (part.state !== "streaming") {
                  return null;
                }

                return (
                  <ChatMessage
                    agentName={agentDetails.name}
                    className="group"
                    isUser={false}
                    key={`${msg.id}-${idx}`}
                  >
                    <div className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs text-muted-foreground">
                      <span className="relative flex size-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/50" />
                        <span className="relative inline-flex size-2 rounded-full bg-primary" />
                      </span>
                      <div className="flex items-center gap-1">
                        <span>Thinking</span>
                        <span
                          className="inline-flex gap-0.5"
                          aria-hidden="true"
                        >
                          <span className="size-1 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
                          <span className="size-1 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
                          <span className="size-1 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
                        </span>
                      </div>
                    </div>
                  </ChatMessage>
                );
              }

              if (!("toolCallId" in part) || !part.type.startsWith("tool-")) {
                return null;
              }

              const hasTextContent = msg.parts.some(
                (msgPart) =>
                  (msgPart.type === "text" || msgPart.type === "reasoning") &&
                  msgPart.text.trim().length > 0,
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
      {/* Input Footer */}
      <div className="sticky bottom-0 pt-4 md:pt-8 z-50">
        <div className="max-w-3xl mx-auto bg-background rounded-[20px] pb-2 md:pb-8">
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
                    className="rounded-full h-8"
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
          {messages.length > 0 && <ChatDisclaimer />}
        </div>
      </div>
    </>
  );
}
