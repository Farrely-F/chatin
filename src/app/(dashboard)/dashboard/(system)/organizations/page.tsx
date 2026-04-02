import {
  PageLayout,
  PageLayoutContent,
  PageLayoutHeader,
} from "@/components/ui/layout/page-layout";
import { OrganizationsManagement } from "@/features/organizations/organizations-management";
import { getCurrentUser } from "@/lib/auth/auth";
import { getAllOrganizationsWithMembers } from "@/service/organizations";
import { getAllUsersWithRoles } from "@/service/users";

export default async function OrganizationsPage() {
  const user = await getCurrentUser();

  const [organizations, users] = await Promise.all([
    getAllOrganizationsWithMembers(user?.id || ""),
    getAllUsersWithRoles(),
  ]);

  if ("error" in organizations || "error" in users) {
    return null;
  }

  return (
    <PageLayout className="space-y-8">
      <PageLayoutHeader className="container mx-auto space-y-2 pt-10">
        <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
        <p className="text-muted-foreground">
          Create and edit organizations, then batch assign users to shared
          workspaces.
        </p>
      </PageLayoutHeader>
      <PageLayoutContent>
        <OrganizationsManagement
          actorUserId={user?.id || ""}
          organizations={organizations}
          users={users}
        />
      </PageLayoutContent>
    </PageLayout>
  );
}
