import {
  PageLayout,
  PageLayoutContent,
  PageLayoutHeader,
} from "@/components/ui/layout/page-layout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PublicDeployedAgents } from "@/features/public-deployed-agents/public-deployed-agents";
import { getCurrentUser } from "@/lib/auth/auth";
import { hasScopedPermission } from "@/lib/check-permission";
import { getOrganizationPublicDeployedAgents } from "@/service/agents";
import { getPrimaryOrganizationForUser } from "@/service/organizations";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function OrganizationMonitoringPublicAgentsPage() {
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect("/login");
  }

  const organization = await getPrimaryOrganizationForUser(user.id);

  if (!organization?.id) {
    redirect("/dashboard");
  }

  const authorized = await hasScopedPermission(
    user.id,
    "monitoring.read",
    organization.id,
  );

  if (!authorized) {
    redirect("/dashboard");
  }

  const agents = await getOrganizationPublicDeployedAgents(user.id);

  return (
    <PageLayout className="container mx-auto space-y-8">
      <PageLayoutHeader className="space-y-3 pt-10">
        <h1 className="text-3xl font-bold tracking-tight">Deployed Agents</h1>
        <p className="text-muted-foreground">
          Review and archive agents deployed for {organization.name}.
        </p>
        <Tabs value="public-agents">
          <TabsList>
            <TabsTrigger value="overview" asChild>
              <Link href="/dashboard/monitoring/organization">Overview</Link>
            </TabsTrigger>
            <TabsTrigger value="public-agents" asChild>
              <Link href="/dashboard/monitoring/organization/deployed-agents">
                Deployed Agents
              </Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </PageLayoutHeader>
      <PageLayoutContent className="space-y-4">
        <PublicDeployedAgents userId={user.id} agents={agents} />
      </PageLayoutContent>
    </PageLayout>
  );
}
