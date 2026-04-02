"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Permissions } from "@/service/permissions";
import { RoleWithPermissions } from "@/service/roles";

import { CreateRoleDialog } from "./create-role-dialog";
import { RolesTable } from "./roles-table";

export function RoleManagement({
  userId,
  roles,
  permissions,
}: Readonly<{
  userId: string;
  roles: RoleWithPermissions[];
  permissions: Permissions[];
}>) {
  return (
    <Card onClick={(e) => e.stopPropagation()}>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap">
        <div>
          <CardTitle>User Roles</CardTitle>
          <CardDescription>
            Manage roles and their associated permissions.
          </CardDescription>
        </div>
        <CreateRoleDialog userId={userId} availablePermissions={permissions} />
      </CardHeader>
      <CardContent className="@container">
        <RolesTable
          roles={roles}
          userId={userId}
          availablePermissions={permissions}
        />
      </CardContent>
    </Card>
  );
}
