import { cn } from "@/lib/utils";
import { UserCircle2Icon } from "lucide-react";

type ChatMessageProps = {
  children: React.ReactNode;
  isUser?: boolean;
  messageActions?: React.ReactNode;
  className?: string;
  agentName?: string;
};

export function ChatMessage({
  isUser,
  children,
  messageActions,
  className,
  agentName,
}: ChatMessageProps) {
  return (
    <article
      className={cn(
        "flex items-start gap-4 text-[15px] leading-relaxed",
        isUser && "flex-row-reverse",
        className,
      )}
    >
      {isUser ? (
        <UserCircle2Icon
          width={40}
          height={40}
          strokeWidth={1.5}
          className="size-8 min-w-8 text-muted-foreground"
        />
      ) : (
        <div className="size-8 aspect-square grid place-content-center bg-muted rounded-full text-sidebar text-xs uppercase">
          {agentName?.substring(0, 2)}
        </div>
      )}
      <div
        className={cn(
          isUser ? "bg-muted px-4 py-3 rounded-xl" : "space-y-4 w-full",
        )}
      >
        <div className="flex flex-col gap-3">
          <p className="sr-only">{isUser ? "You" : "Assistant"} said:</p>
          {children}
        </div>
        {!isUser && messageActions}
      </div>
    </article>
  );
}
