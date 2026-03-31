import {
  PageLayout,
  PageLayoutContent,
  PageLayoutHeader,
} from "@/components/ui/layout/page-layout";
import { PulseCard } from "@/components/ui/pulse-card";
import { getDeployedAgents } from "@/service/agents";
import { MessageCircle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DeployedAgents() {
  const agents = await getDeployedAgents();

  return (
    <PageLayout className="container mx-auto">
      <PageLayoutHeader className="space-y-2 pt-10 z-40">
        <h1 className="text-3xl font-bold tracking-tight">Deployed Agents</h1>
      </PageLayoutHeader>
      <PageLayoutContent>
        {agents?.length === 0 ? (
          <div className="flex flex-col gap-2 border rounded-lg items-center justify-center h-[80%] p-4">
            <MessageCircle className="text-muted-foreground block size-18" />
            <p className="text-muted-foreground text-sm">
              No agents deployed yet. Deploy an agent to see it here!
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-4 items-stretch">
            {agents.map((agent) => (
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
      </PageLayoutContent>
    </PageLayout>
  );
}
