"use client";

import { Button } from "@/components/ui/button";
import EditAgentDialog from "@/features/chat-playground/edit-agent-config";
import { AgentDetails } from "@/service/agents";
import { ModelDetails } from "@/service/model";
import { PersonaDetails } from "@/service/personas";
import { useChat } from "@ai-sdk/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, StopCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "./badge";
import { ChatMessage } from "./chat-message";
import { CodeBlock } from "./code-block";
import { Form, FormField } from "./form";

const formSchema = z.object({
  message: z.string().trim().min(1),
});

export default function Chat({
  agentDetails,
  models,
  personas,
  userId,
}: {
  agentDetails: AgentDetails;
  models: ModelDetails[];
  personas: PersonaDetails[];
  userId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [usedToken, setUsedToken] = useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });

  const { messages, handleSubmit, append, status, stop } = useChat({
    api: `/api/v1/agents/${agentDetails.id}/playground`,
    body: {
      user_id: userId,
    },
    maxSteps: 5,
    onFinish(_, options) {
      setUsedToken(options?.usage?.totalTokens ?? 0);
    },
    onError(error) {
      toast.error(error instanceof Error ? error.message : error);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleMessageSubmit = () => {
    startTransition(async () => {
      append({
        role: "user",
        content: form.getValues("message"),
      });

      handleSubmit();

      form.reset({
        message: "",
      });
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
      {/* Header */}
      <div className="py-5 bg-background sticky top-0 z-10 before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-gradient-to-r before:from-black/[0.06] before:via-black/10 before:to-black/[0.06]">
        <div className="flex max-w-3xl mx-auto items-center justify-between gap-2">
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

      {/* Chat */}
      <div className="relative grow">
        <div className="max-w-3xl mx-auto mt-6 space-y-6 space-x-2">
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
                              <code
                                className="px-1.5 py-0.5 rounded bg-muted text-sm"
                                {...props}
                              >
                                {children}
                              </code>
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

      {/* Footer */}
      <div className="sticky bottom-0 pt-4 md:pt-8 z-50">
        <div className="max-w-3xl mx-auto bg-background rounded-[20px] pb-4 md:pb-8">
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
                <div className="flex items-center justify-between gap-2 p-3">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {usedToken} tokens used
                    </p>
                  </div>
                  <Button
                    type={status === "streaming" ? "button" : "submit"}
                    variant="gradient"
                    className={`rounded-full h-8 ${
                      status === "streaming" ? "animate-pulse" : ""
                    }`}
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
        </div>
      </div>
    </>
  );
}
