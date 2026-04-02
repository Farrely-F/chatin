import {
  PageLayout,
  PageLayoutContent,
  PageLayoutHeader,
} from "@/components/ui/layout/page-layout";
import { WorkspaceOrganizationManagement } from "@/features/organizations/workspace-organization-management";
import { getCurrentUser } from "@/lib/auth/auth";
import {
  getManagedOrganizationForUser,
  getOrganizationWorkspaceData,
} from "@/service/organizations";
import { redirect } from "next/navigation";

export default async function WorkspaceOrganizationPage() {
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect("/login");
  }

  const managedOrganization = await getManagedOrganizationForUser(user.id);

  if (!managedOrganization?.id) {
    redirect("/dashboard");
  }

  const organization = await getOrganizationWorkspaceData(
    user.id,
    managedOrganization.id,
  );

  if ("error" in organization) {
    redirect("/dashboard");
  }

  return (
    <PageLayout className="space-y-8">
      <PageLayoutHeader className="container mx-auto space-y-2 pt-10">
        <h1 className="text-3xl font-bold tracking-tight">Workspace</h1>
        <p className="text-muted-foreground">
          Manage your organization details and workspace members.
        </p>
      </PageLayoutHeader>
      <PageLayoutContent>
        <WorkspaceOrganizationManagement
          actorUserId={user.id}
          organization={organization}
        />
      </PageLayoutContent>
    </PageLayout>
  );
}
