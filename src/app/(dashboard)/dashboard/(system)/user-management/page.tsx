import {
  PageLayout,
  PageLayoutContent,
  PageLayoutHeader,
} from "@/components/ui/layout/page-layout";
import { UserManagement } from "@/features/user-management/user-management";
import { getCurrentUser } from "@/lib/auth/auth";
import { getAllRoles } from "@/service/roles";
import { getAllUsersWithRoles } from "@/service/users";

export default async function UserManagementPage() {
  const user = await getCurrentUser();

  const users = await getAllUsersWithRoles();
  const roles = await getAllRoles();

  if ("error" in users || "error" in roles) {
    return null;
  }

  return (
    <PageLayout className="space-y-8">
      <PageLayoutHeader className="container mx-auto space-y-2 pt-10">
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          Manage user and their associated role
        </p>
      </PageLayoutHeader>
      <PageLayoutContent>
        <UserManagement users={users} roles={roles} userId={user?.id || ""} />
      </PageLayoutContent>
    </PageLayout>
  );
}
