"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Permissions } from "@/service/permissions";

import { CreatePermissionDialog } from "./create-permission-dialog";
import { PermissionsTable } from "./permission-table";

export function PermissionManagement({
  userId,
  permissions,
}: {
  userId: string;
  permissions: Permissions[];
}) {
  // Extract categories from permissions for filtering
  const categories = Array.from(
    new Set(
      permissions?.map((p) => {
        const parts = p.permission.split(".");
        return parts?.length > 1 ? parts[0] : "other";
      }),
    ),
  );

  return (
    <Card onClick={(e) => e.stopPropagation()}>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap">
        <div>
          <CardTitle>Permissions</CardTitle>
          <CardDescription>
            Manage the permissions that can be assigned to roles.
          </CardDescription>
        </div>
        <CreatePermissionDialog userId={userId} />
      </CardHeader>
      <CardContent className="@container">
        <PermissionsTable categories={categories} permissions={permissions} />
      </CardContent>
    </Card>
  );
}
