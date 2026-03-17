"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { CopyButton } from "@/components/ui/copy-button";
import { useChatStore } from "@/lib/chat-store";
import { AgentDetails } from "@/service/agents";
import { useChat } from "@ai-sdk/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { DefaultChatTransport, type UIMessage } from "ai";
import { StopCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { useForm } from "react-hook-form";
import ReactMarkdown from "react-markdown";
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

export default function Chat({ agentDetails }: { agentDetails: AgentDetails }) {
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
                      components={{
                        code({ className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || "");
                          return match ? (
                            <CodeBlock
                              language={match[1]}
                              value={String(children).replace(/\n$/, "")}
                            />
                          ) : (
                            <pre className="w-full overflow-x-auto">
                              <code
                                className="px-1.5 py-0.5 rounded bg-muted text-sm"
                                {...props}
                              >
                                {children}
                              </code>
                            </pre>
                          );
                        },
                      }}
                    >
                      {part.text}
                    </ReactMarkdown>
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
                    onClick={() => (status !== "ready" ? stop() : null)}
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
