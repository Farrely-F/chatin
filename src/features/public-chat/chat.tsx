"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { CopyButton } from "@/components/ui/copy-button";
import { useChatStore } from "@/lib/chat-store";
import { AgentDetails } from "@/service/agents";
import { type Message, useChat } from "@ai-sdk/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { StopCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { useForm } from "react-hook-form";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { z } from "zod";

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
  const messageHistoryRef = useRef<Message[]>([]);

  const params = useParams();
  const { slug, chatId } = params as { slug: string; chatId: string };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });

  const { saveChatHistory, loadChatHistory, saveChatList, getChatList } =
    useChatStore();

  const { messages, handleSubmit, append, status, stop, setMessages } = useChat(
    {
      api: `/api/v1/agents/${agentDetails.id}/public/chat/stream`,
      maxSteps: 5,
      body: {
        user_id: agentDetails?.userId,
      },
      onFinish: async (msg) => {
        const current = messageHistoryRef.current;

        // Check for duplicate ID
        const isDuplicate = current.some((m) => m.id === msg.id);
        const uniqueMessage = isDuplicate
          ? { ...msg, id: crypto.randomUUID() }
          : msg;

        const updated = [...current, uniqueMessage];
        messageHistoryRef.current = updated;
        saveChatHistory(slug, chatId, updated);
      },
      onError(error) {
        toast.error(error instanceof Error ? error.message : error);
      },
    },
  );

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
    startTransition(() => {
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: form.getValues("message"),
      };

      if (messageHistoryRef.current.length === 0) {
        const chatList = getChatList(slug);
        const firstMessageTitle = userMessage.content.slice(0, 40);
        const metadata = {
          chatId,
          slug,
          title: firstMessageTitle || "Untitled chat",
          createdAt: new Date().toISOString(),
        };
        saveChatList(slug, [metadata, ...chatList]);
      }

      messageHistoryRef.current = [...messageHistoryRef.current, userMessage];
      saveChatHistory(slug, chatId, messageHistoryRef.current);

      append(userMessage);
      handleSubmit();
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
        <div className="max-w-3xl mx-auto mt-6 space-y-6">
          {messages.map((msg) => {
            return msg.parts.map((part, idx) => {
              switch (part.type) {
                case "text":
                  return (
                    <ChatMessage
                      agentName={agentDetails.name}
                      className="group"
                      isUser={msg.role === "user"}
                      key={idx}
                      messageActions={
                        <div className="flex items-center gap-2 text-muted-foreground text-xs group-hover:scale-100 scale-0 transition-transform ease-in-out origin-left">
                          <CopyButton value={part?.text} />
                          <p>Copy Message</p>
                        </div>
                      }
                    >
                      <ReactMarkdown
                        components={{
                          code({ className, children, ...props }) {
                            const match = /language-(\w+)/.exec(
                              className || "",
                            );
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
                case "tool-invocation":
                  if (msg.content.length === 0) {
                    return (
                      <Badge
                        variant={"secondary"}
                        key={part.toolInvocation.toolCallId}
                        className="italic"
                      >
                        🛠️ {part.toolInvocation.toolName.split("_").join(" ")}
                      </Badge>
                    );
                  }
                default:
                  return null;
              }
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
