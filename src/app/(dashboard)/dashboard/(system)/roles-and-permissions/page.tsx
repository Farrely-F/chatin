import {
  PageLayout,
  PageLayoutContent,
  PageLayoutHeader,
} from "@/components/ui/layout/page-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionManagement } from "@/features/permissions/permission-management";
import { RoleManagement } from "@/features/roles/role-management";
import { getCurrentUser } from "@/lib/auth/auth";
import { getAllPermissions } from "@/service/permissions";
import { getAllRolesWithPermission } from "@/service/roles";

export default async function RoleAndPermissionsPage() {
  const user = await getCurrentUser();

  const permissions = await getAllPermissions();
  const roles = await getAllRolesWithPermission();

  return (
    <PageLayout className="container mx-auto py-10 space-y-8">
      <PageLayoutHeader className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Access Management</h1>
        <p className="text-muted-foreground">
          Manage roles and permissions for your application.
        </p>
      </PageLayoutHeader>

      <PageLayoutContent>
        <Tabs defaultValue="roles" className="space-y-6">
          <TabsList>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          </TabsList>
          <TabsContent value="roles">
            <RoleManagement
              userId={user?.id || ""}
              permissions={permissions}
              roles={roles!}
            />
          </TabsContent>
          <TabsContent value="permissions">
            <PermissionManagement
              userId={user?.id || ""}
              permissions={permissions}
            />
          </TabsContent>
        </Tabs>
      </PageLayoutContent>
    </PageLayout>
  );
}
