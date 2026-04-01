import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AgentCreation from "@/features/agents/agent-creation";
import DeleteAgent from "@/features/agents/delete-agent";
import { getCurrentUser } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/check-permission";
import { cn } from "@/lib/utils";
import { getAllAgentWithModel, getDeployedAgents } from "@/service/agents";
import { getAllModels } from "@/service/model";
import { TabsContent } from "@radix-ui/react-tabs";
import { BotIcon, MessageCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

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

type AgentPageSearchParams = Promise<{
  view?: string | string[];
}>;

function getFirstParam(value?: string | string[]): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function AgentPage({
  searchParams,
}: {
  readonly searchParams: AgentPageSearchParams;
}) {
  const params = await searchParams;
  const viewParam = getFirstParam(params.view);
  const activeView = viewParam === "deployed" ? "deployed" : "created";

  const user = await getCurrentUser();

  if (!user) {
    return;
  }

  const modelsPromise = getAllModels();
  const createdAgentsPromise = getAllAgentWithModel(user.id).then((res) =>
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
  const deployedAgentsPromise = getDeployedAgents();

  const [models, createdAgents, deployedAgents] = await Promise.all([
    modelsPromise,
    createdAgentsPromise,
    deployedAgentsPromise,
  ]);

  const createAgentPermission = await hasPermission(
    user?.id || "",
    "agent.create",
  );

  if (!createAgentPermission && activeView === "created") {
    redirect("/dashboard/agents?view=deployed");
  }

  const createdAgentsCount = createdAgents?.length ?? 0;
  const deployedAgentsCount = deployedAgents?.length ?? 0;
  const unavailableModelsCount =
    createdAgents?.filter((agent) => !agent.model.isAvailable).length ?? 0;

  return (
    <PageLayout>
      <PageLayoutHeader className="flex items-center justify-between bg-white py-4 z-40">
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl">AI Agents</h1>
          <p className="text-sm text-muted-foreground">
            Manage private agents and deployed chat endpoints.
          </p>
        </div>
        {activeView === "created" && createAgentPermission ? (
          <AgentCreation models={models} />
        ) : null}
      </PageLayoutHeader>
      <PageLayoutContent className="space-y-4">
        {createAgentPermission && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Created
              </p>
              <p className="text-2xl font-semibold">{createdAgentsCount}</p>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Deployed
              </p>
              <p className="text-2xl font-semibold">{deployedAgentsCount}</p>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Unavailable Models
              </p>
              <p className="text-2xl font-semibold">{unavailableModelsCount}</p>
            </div>
          </div>
        )}

        <Tabs
          value={createAgentPermission ? activeView : "deployed"}
          className="gap-0 flex-1"
        >
          {createAgentPermission && (
            <TabsList className="p-2 h-11 rounded-b-none shadow-sm">
              <TabsTrigger value="created" asChild>
                <Link href="/dashboard/agents">Created</Link>
              </TabsTrigger>
              <TabsTrigger value="deployed" asChild>
                <Link href="/dashboard/agents?view=deployed">Deployed</Link>
              </TabsTrigger>
            </TabsList>
          )}
          <TabsContent
            value="created"
            className="bg-muted p-4 rounded-lg rounded-tl-none h-full"
          >
            {activeView === "created" && createdAgents?.length === 0 && (
              <div className="flex flex-col gap-2 border rounded-lg items-center justify-center h-full bg-background p-4">
                <BotIcon
                  aria-hidden="true"
                  className="text-muted-foreground block size-18"
                />
                <p className="text-muted-foreground text-sm">
                  Create your first agent
                </p>
                {createAgentPermission ? (
                  <AgentCreation models={models} />
                ) : null}
              </div>
            )}

            {activeView === "created" &&
              createdAgents &&
              createdAgents.length > 0 && (
                <div className="grid grid-cols-1 gap-4 items-stretch md:grid-cols-2 2xl:grid-cols-3">
                  {createdAgents.map((agent) => (
                    <div key={agent.id} className="relative isolate">
                      <Link
                        href={`/dashboard/agents/${agent.id}`}
                        className={
                          agent.model.isAvailable ? "block" : "block opacity-65"
                        }
                      >
                        <PulseCard
                          icon={
                            <agent.icon className="size-5 grid place-content-center" />
                          }
                          title={agent.name}
                          description={agent.description!}
                          variant={agent.color}
                          className={`border w-full h-full`}
                        />
                      </Link>

                      {agent.model.isAvailable ? null : (
                        <Badge
                          variant="outline"
                          className="absolute top-4 left-4 bg-background/90"
                        >
                          Unavailable
                        </Badge>
                      )}

                      <DeleteAgent
                        userId={user?.id || ""}
                        agentId={agent.id}
                        className="absolute top-4 right-2"
                      />
                    </div>
                  ))}
                </div>
              )}
          </TabsContent>

          <TabsContent
            value="deployed"
            className={cn(
              "w-full h-full bg-muted p-4 rounded-lg",
              createAgentPermission && "rounded-tl-none",
            )}
          >
            {activeView === "deployed" && deployedAgents?.length === 0 && (
              <div className="flex flex-col gap-2 border rounded-lg items-center justify-center p-4 bg-background h-full">
                <MessageCircle
                  aria-hidden="true"
                  className="text-muted-foreground block size-18"
                />
                <p className="text-muted-foreground text-sm">
                  No agents deployed yet.
                </p>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/agents">Go to Created Agents</Link>
                </Button>
              </div>
            )}

            {activeView === "deployed" && deployedAgents.length > 0 && (
              <div className="grid grid-cols-1 gap-4 items-stretch md:grid-cols-2 2xl:grid-cols-3">
                {deployedAgents.map((agent) => (
                  <Link href={`/chat/${agent.slug}`} key={agent.id}>
                    <PulseCard
                      title={agent.name}
                      description={agent.description || ""}
                      icon={<MessageCircle />}
                      className="h-full"
                      variant="blue"
                    />
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </PageLayoutContent>
    </PageLayout>
  );
}
