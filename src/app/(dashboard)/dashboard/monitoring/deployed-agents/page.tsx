import {
  PageLayout,
  PageLayoutContent,
  PageLayoutHeader,
} from "@/components/ui/layout/page-layout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PublicDeployedAgents } from "@/features/public-deployed-agents/public-deployed-agents";
import { getCurrentUser } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/check-permission";
import { getPublicDeployedAgents } from "@/service/agents";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function MonitoringPublicAgentsPage() {
  const user = await getCurrentUser();
  const hasSystemAccess = await hasPermission(user?.id || "", "system.read");

  if (!hasSystemAccess) {
    redirect("/dashboard/monitoring/organization");
  }

  const agents = await getPublicDeployedAgents(undefined);

  return (
    <PageLayout className="container mx-auto space-y-8">
      <PageLayoutHeader className="space-y-3 pt-10">
        <h1 className="text-3xl font-bold tracking-tight">Deployed Agents</h1>
        <p className="text-muted-foreground">
          Review and archive agents currently deployed to the public.
        </p>
        <Tabs value="public-agents">
          <TabsList>
            <TabsTrigger value="overview" asChild>
              <Link href="/dashboard/monitoring">Overview</Link>
            </TabsTrigger>
            <TabsTrigger value="public-agents" asChild>
              <Link href="/dashboard/monitoring/deployed-agents">
                Deployed Agents
              </Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </PageLayoutHeader>
      <PageLayoutContent className="space-y-4">
        <PublicDeployedAgents userId={user?.id || ""} agents={agents} />
      </PageLayoutContent>
    </PageLayout>
  );
}
