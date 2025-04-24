"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleDetails } from "@/service/roles";
import { UserWithRoles } from "@/service/users";

import { CreateUserDialog } from "./create-user-dialog";
import { UsersTable } from "./users-table";

export function UserManagement({
  userId,
  users,
  roles,
}: {
  userId: string;
  users: UserWithRoles[];
  roles: RoleDetails[];
}) {
  return (
    <Card onClick={(e) => e.stopPropagation()}>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <div>
          <CardTitle>Active User</CardTitle>
        </div>
        <CreateUserDialog userId={userId} />
      </CardHeader>
      <CardContent className="@container">
        <UsersTable userId={userId} users={users} roles={roles} />
      </CardContent>
    </Card>
  );
}
