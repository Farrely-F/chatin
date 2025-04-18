"use client";

import { Button } from "@/components/ui/button";
import { AgentDetails } from "@/service/agents";
import { Message, useChat } from "@ai-sdk/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { StopCircle } from "lucide-react";
import { useEffect, useRef, useTransition } from "react";
import { useForm } from "react-hook-form";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { z } from "zod";

import { ChatMessage } from "../../components/ui/chat-message";
import { Form, FormField } from "../../components/ui/form";

const formSchema = z.object({
  message: z.string().trim().min(1),
});

export default function Chat({
  agentDetails,
  initialMessage,
}: {
  agentDetails: AgentDetails;
  initialMessage?: Message[];
}) {
  const [, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });

  const { messages, handleSubmit, append, status, stop } = useChat({
    api: `/api/v1/agents/${agentDetails.id}/public/chat/stream`,
    maxSteps: 2,
    body: {
      user_id: agentDetails?.userId,
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

  useEffect(() => {
    if (status === "error") {
      toast.error("Something went wrong. Please try again.");
    }
  }, [status]);

  return (
    <>
      {/* Chat */}
      <div className="relative grow">
        <div className="max-w-3xl mx-auto mt-6 space-y-6">
          {messages.map((msg) =>
            msg.content.length > 0 ? (
              <ChatMessage key={msg.id} isUser={msg.role === "user"}>
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </ChatMessage>
            ) : (
              <span key={msg.id} className="italic font-light">
                {"calling tool: " + msg?.toolInvocations?.[0].toolName}
              </span>
            ),
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
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          if (status !== "ready") {
                            stop();
                            return;
                          }
                          form.handleSubmit(handleMessageSubmit)();
                        }
                      }}
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
        </div>
      </div>
    </>
  );
}
