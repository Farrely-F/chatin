"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Permissions } from "@/service/permissions";
import { useState } from "react";

import BatchDeletePermission from "./batch-delete-permission";
import { CreatePermissionDialog } from "./create-permission-dialog";
import { PermissionsTable } from "./permission-table";

export function PermissionManagement({
  userId,
  permissions,
}: Readonly<{
  userId: string;
  permissions: Permissions[];
}>) {
  const [batchSelectIds, setBatchSelectIds] = useState<string[]>([]);

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
        <div className="flex items-center gap-1">
          {batchSelectIds.length > 0 && (
            <BatchDeletePermission
              ids={batchSelectIds}
              setBatchSelectIds={setBatchSelectIds}
            />
          )}
          <CreatePermissionDialog userId={userId} />
        </div>
      </CardHeader>
      <CardContent className="@container">
        <PermissionsTable
          userId={userId}
          batchSelectIds={batchSelectIds}
          setBatchSelectIds={setBatchSelectIds}
          categories={categories}
          permissions={permissions}
        />
      </CardContent>
    </Card>
  );
}
