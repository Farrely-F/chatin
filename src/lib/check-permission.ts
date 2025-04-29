"use server";

import { db } from "@/db";
import { permissions, rolePermissions, roles, userRoles } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { getCurrentUser } from "./auth/auth";

export async function hasPermission(userId: string, permission: string) {
  try {
    const result = await db
      .select({
        permission: permissions.permission,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(permissions.permission, permission),
        ),
      );

    return result.length > 0;
  } catch {
    return false;
  }
}

export async function protectedPage(permission: string) {
  const user = await getCurrentUser();

  const [isAdmin, authorized] = await Promise.all([
    hasPermission(user?.id as string, "system.create"),
    hasPermission(user?.id as string, permission),
  ]);

  if (isAdmin) {
    return;
  }

  if (!authorized) {
    return redirect("/dashboard");
  }

  return;
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    const result = await db
      .select({
        permission: permissions.permission,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(userRoles.userId, userId));

    return result.map((row) => row.permission);
  } catch {
    return [];
  }
}

interface WithPermissionOptions<TArgs extends unknown[], TResult> {
  userId: string;
  permission: string;
  action: (...args: TArgs) => Promise<TResult>;
  onSuccess?: (res: TResult) => void;
  onError?: (error: string) => void;
}

export const withPermission = async <TArgs extends unknown[], TResult>(
  { userId, permission, action }: WithPermissionOptions<TArgs, TResult>,
  ...args: TArgs
): Promise<TResult | { error: string }> => {
  try {
    const authorized = await hasPermission(userId, permission);

    if (!authorized) {
      return { error: "Unauthorized" };
    }

    const res = await action(...args);

    return res;
  } catch (err: unknown) {
    const errorMsg = (err as Error).message;
    return { error: errorMsg };
  }
};

export type UserPermissions = Awaited<ReturnType<typeof getUserPermissions>>;
