import { Anthropic, Google, OpenAI } from "@/components/ui/icons/llm-provider";
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutHeader,
} from "@/components/ui/layout/page-layout";
import { PulseCard } from "@/components/ui/pulse-card";
import AgentCreation from "@/features/agents/agent-creation";
import DeleteAgent from "@/features/agents/delete-agent";
import { getCurrentUser } from "@/lib/auth/auth";
import { getAllAgents } from "@/service/agents";
import { BotIcon } from "lucide-react";
import Link from "next/link";

const providerColorMap = {
  openai: {
    color: "emerald",
    icon: OpenAI,
  },
  google: {
    color: "rose",
    icon: Google,
  },
  anthropic: {
    color: "amber",
    icon: Anthropic,
  },
} satisfies Record<
  string,
  {
    color: "amber" | "rose" | "emerald";
    icon: React.ElementType;
  }
>;

export default async function AgentPage() {
  const user = await getCurrentUser();

  const agents = await getAllAgents(user?.id || "").then((res) =>
    res.map((agent) => ({
      ...agent,
      color: providerColorMap[agent.llmProvider].color || "blue",
      icon: providerColorMap[agent.llmProvider].icon,
    })),
  );

  return (
    <PageLayout>
      <PageLayoutHeader className="flex items-center justify-between bg-white py-4 z-40">
        <h1 className="text-2xl">AI Agents</h1>
        <AgentCreation />
      </PageLayoutHeader>
      <PageLayoutContent>
        {agents.length === 0 ? (
          <div className="flex flex-col gap-2 border rounded-lg items-center justify-center h-[80%]">
            <BotIcon className="text-muted-foreground block size-18" />
            <p className="text-muted-foreground text-sm">
              Create your first agent
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-4 items-stretch">
            {agents.map((agent) => (
              <Link href={`/dashboard/agents/${agent.id}`} key={agent.id}>
                <PulseCard
                  actionButton={
                    <DeleteAgent
                      userId={user?.id || ""}
                      agentId={agent.id}
                      className="absolute top-4 right-2"
                    />
                  }
                  icon={
                    <agent.icon className="size-5 grid place-content-center" />
                  }
                  title={agent.name}
                  description={agent.description!}
                  variant={agent.color}
                  className="border w-full h-full"
                />
              </Link>
            ))}
          </div>
        )}
      </PageLayoutContent>
    </PageLayout>
  );
}
