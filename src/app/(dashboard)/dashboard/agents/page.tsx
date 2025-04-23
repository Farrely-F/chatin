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
import { PulseCard } from "@/components/ui/pulse-card";
import AgentCreation from "@/features/agents/agent-creation";
import DeleteAgent from "@/features/agents/delete-agent";
import { getCurrentUser } from "@/lib/auth/auth";
import { getAllAgentWithModel } from "@/service/agents";
import { getAllModels } from "@/service/model";
import { BotIcon } from "lucide-react";
import Link from "next/link";

function providerIconAndColor(provider: string) {
  switch (provider) {
    case "openai":
      return {
        color: "emerald",
        icon: OpenAI,
      };

    case "google":
      return {
        color: "rose",
        icon: Google,
      };
    case "anthropic":
      return {
        color: "amber",
        icon: Anthropic,
      };
    case "openrouter":
      return {
        color: "purple",
        icon: OpenRouter,
      };
    case "groq":
      return {
        color: "blue",
        icon: Groq,
      };
    default:
      return {
        color: "blue",
        icon: BotIcon,
      };
  }
}

export default async function AgentPage() {
  const user = await getCurrentUser();

  if (!user) {
    return;
  }
  const models = await getAllModels();
  const agents = await getAllAgentWithModel(user.id).then((res) =>
    res?.map((agent) => ({
      ...agent,
      color: providerIconAndColor(agent?.model?.provider).color as
        | "emerald"
        | "blue"
        | "purple"
        | "amber"
        | "rose",
      icon: providerIconAndColor(agent?.model?.provider).icon,
    })),
  );

  return (
    <PageLayout>
      <PageLayoutHeader className="flex items-center justify-between bg-white py-4 z-40">
        <h1 className="text-2xl">AI Agents</h1>
        <AgentCreation models={models} />
      </PageLayoutHeader>
      <PageLayoutContent>
        {agents?.length === 0 ? (
          <div className="flex flex-col gap-2 border rounded-lg items-center justify-center h-[80%] p-4">
            <BotIcon className="text-muted-foreground block size-18" />
            <p className="text-muted-foreground text-sm">
              Create your first agent
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-4 items-stretch">
            {agents?.map((agent) => (
              <Link
                href={`/dashboard/agents/${agent.id}`}
                key={agent.id}
                className={agent.model.isAvailable ? "" : "opacity-50"}
              >
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
                  className={`border w-full h-full`}
                />
              </Link>
            ))}
          </div>
        )}
      </PageLayoutContent>
    </PageLayout>
  );
}
