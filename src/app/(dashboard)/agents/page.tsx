import { ScrollArea } from "@/components/ui/scroll-area";
import AgentCreation from "@/features/agents/agent-creation";
import { getAllAgents } from "@/service/agents";

export default async function AgentPage() {
  const agents = await getAllAgents(crypto.randomUUID());

  console.log(agents);

  return (
    <ScrollArea className="flex-1 [&>div>div]:h-full w-full shadow-md md:rounded-s-[inherit] bg-background">
      <div className="h-full flex flex-col px-4 md:px-6 lg:px-8">
        <div className="w-full flex items-center justify-between sticky top-0 bg-white py-4">
          <h1 className="font-bold text-3xl">AI Agents</h1>
          <AgentCreation />
        </div>
        {agents.length === 0 ? (
          <div className="flex border rounded-lg items-center justify-center h-full">
            <p className="text-muted-foreground text-2xl">
              Create your first agent
            </p>
          </div>
        ) : null}
      </div>
    </ScrollArea>
  );
}
