import { AnimatedCard } from "@/components/ui/animated-card";
import { Anthropic, Google, OpenAI } from "@/components/ui/icons/llm-provider";
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutHeader,
} from "@/components/ui/layout/page-layout";
import { VerticalSeparator } from "@/components/ui/separator";
import AgentDetailView from "@/features/agents/agent-details";
import { getCurrentUser } from "@/lib/auth/auth";
import { getAgentWithKnowledgeBase } from "@/service/agents";
import { notFound } from "next/navigation";

const agentConfig = {
  google: {
    icon: <Google className="size-4" />,
    color: "bg-rose-100 border-rose-500",
  },
  openai: {
    icon: <OpenAI className="size-4" />,
    color: "bg-emerald-100 border-emerald-500",
  },
  anthropic: {
    icon: <Anthropic className="size-4" />,
    color: "bg-amber-100 border-amber-500",
  },
};

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  const user = await getCurrentUser();

  const agentDetails = await getAgentWithKnowledgeBase(agentId, user?.id || "");

  if ("error" in agentDetails) {
    notFound();
  }

  return (
    <PageLayout>
      <PageLayoutHeader>
        <div className="flex flex-wrap gap-2 items-center">
          <span
            className={`break-keep inline-flex gap-1 items-center px-2 py-1 text-xs text-muted-foreground border rounded-full ${agentConfig[agentDetails.llmProvider].color}`}
          >
            {agentConfig[agentDetails.llmProvider].icon}
            {agentDetails.llmProvider}
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
        {agentDetails.description && (
          <AnimatedCard
            title="Model Description"
            description={agentDetails.description!}
          />
        )}
        <AgentDetailView
          agentDetails={agentDetails}
          userId={user?.id || ""}
          agentKnowledgeBases={agentDetails.knowledgeBases}
        />
      </PageLayoutContent>
    </PageLayout>
  );
}
