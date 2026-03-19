import { AnimatedCard } from "@/components/ui/animated-card";
import { Badge } from "@/components/ui/badge";
import {
  Anthropic,
  Google,
  Groq,
  OpenAI,
  OpenRouter,
} from "@/components/ui/icons/llm-provider";
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutHeader,
} from "@/components/ui/layout/page-layout";
import { VerticalSeparator } from "@/components/ui/separator";
import AgentDetailView from "@/features/agents/agent-details";
import { getCurrentUser } from "@/lib/auth/auth";
import { getAgentFeedbackList } from "@/service/agent-feedback";
import { getAgentWithKnowledgeBase } from "@/service/agents";
import { getAllModels } from "@/service/model";
import { getAllPersonas } from "@/service/personas";
import { ArrowUpRight, BotIcon, Wrench } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

function agentConfig(provider: string) {
  switch (provider) {
    case "openai":
      return {
        icon: <OpenAI className="size-4" />,
        color: "bg-emerald-100 border-emerald-500",
      };

    case "google":
      return {
        icon: <Google className="size-4" />,
        color: "bg-rose-100 border-rose-500",
      };

    case "anthropic":
      return {
        icon: <Anthropic className="size-4" />,
        color: "bg-amber-100 border-amber-500",
      };
    case "openrouter":
      return {
        icon: <OpenRouter className="size-4" />,
        color: "bg-purple-100 border-purple-500",
      };
    case "groq":
      return {
        icon: <Groq className="size-4" />,
        color: "bg-blue-100 border-blue-500",
      };
    default:
      return {
        icon: <BotIcon className="size-4" />,
        color: "bg-blue-100 border-blue-500",
      };
  }
}
export default async function AgentDetailPage({
  params,
}: {
  readonly params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return;
  }

  const [agentDetails, personas, models, feedbackRows] = await Promise.all([
    getAgentWithKnowledgeBase(agentId, user?.id || ""),
    getAllPersonas(user?.id || ""),
    getAllModels(),
    getAgentFeedbackList(agentId, user?.id || ""),
  ]);

  if ("error" in agentDetails) {
    notFound();
  }

  const agentFeedbacks = feedbackRows.map((item) => ({
    id: item.id,
    assistantMessageId: item.assistantMessageId,
    isHelpful: item.isHelpful,
    userQuestion: item.userQuestion,
    agentResponse: item.agentResponse,
    expectedResponse: item.expectedResponse,
    feedbackNote: item.feedbackNote,
    createdAt: item.createdAt?.toISOString() ?? null,
  }));

  return (
    <PageLayout>
      <PageLayoutHeader>
        <div className="flex flex-wrap gap-2 items-center">
          <span
            className={`break-keep inline-flex gap-1 items-center px-2 py-1 text-xs text-muted-foreground border rounded-full ${agentConfig(agentDetails.model?.provider).color}`}
          >
            {agentConfig(agentDetails.model?.provider).icon}
            {agentDetails.model?.provider}
          </span>
          <h1 className="text-2xl">{agentDetails.name}</h1>
          <VerticalSeparator className="hidden sm:block" />
          <p className="text-xs text-muted-foreground">
            Created :
            <br />
            {agentDetails.createdAt?.toDateString()}
          </p>
        </div>
      </PageLayoutHeader>
      <PageLayoutContent>
        <div className="flex items-center gap-2 mb-4 text-xs">
          <Badge asChild variant={"secondary"}>
            <Link href={`/chat/${agentDetails.slug}`}>
              <span
                className={`size-2 aspect-square rounded-full ${agentDetails.status === "active" ? "bg-green-200" : "bg-yellow-200"}`}
              />
              {agentDetails.status === "active" ? (
                <>
                  {agentDetails.status}
                  <ArrowUpRight className="size-4" />
                </>
              ) : (
                agentDetails.status
              )}
            </Link>
          </Badge>
          <Badge variant={"secondary"}>
            knowledgebase: {agentDetails.knowledgeBases.length}
          </Badge>
          <Badge variant={"secondary"} className="lowercase">
            persona: {agentDetails?.personas?.name || "none"}
          </Badge>
          {agentDetails.model?.supportsToolUse && (
            <Badge variant={"secondary"} className="lowercase">
              <Wrench className="text-muted-foreground" />
              support tool use
            </Badge>
          )}
        </div>
        {agentDetails.description && (
          <AnimatedCard
            title="Agent Description"
            description={agentDetails.description!}
          />
        )}
        <AgentDetailView
          models={models}
          agentDetails={agentDetails}
          userId={user?.id || ""}
          agentKnowledgeBases={agentDetails.knowledgeBases}
          personas={personas}
          agentFeedbacks={agentFeedbacks}
        />
      </PageLayoutContent>
    </PageLayout>
  );
}
