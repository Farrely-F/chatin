"use server";

import { db } from "@/db";
import {
  organizationUserRoles,
  permissions,
  rolePermissions,
  roles,
  userRoles,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { getCurrentUser } from "./auth/auth";

export async function isSystemAdmin(userId: string) {
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
          eq(permissions.permission, "system.create"),
        ),
      );

    return result.length > 0;
  } catch {
    return false;
  }
}

export async function hasPermission(userId: string, permission: string) {
  try {
    if (await isSystemAdmin(userId)) {
      return true;
    }

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

export async function hasOrganizationPermission(
  userId: string,
  organizationId: string,
  permission: string,
) {
  try {
    if (await isSystemAdmin(userId)) {
      return true;
    }

    const result = await db
      .select({
        permission: permissions.permission,
      })
      .from(organizationUserRoles)
      .innerJoin(roles, eq(organizationUserRoles.roleId, roles.id))
      .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(
        and(
          eq(organizationUserRoles.userId, userId),
          eq(organizationUserRoles.organizationId, organizationId),
          eq(permissions.permission, permission),
        ),
      );

    return result.length > 0;
  } catch {
    return false;
  }
}

export async function hasAnyOrganizationPermission(
  userId: string,
  permission: string,
) {
  try {
    if (await isSystemAdmin(userId)) {
      return true;
    }

    const result = await db
      .select({
        permission: permissions.permission,
      })
      .from(organizationUserRoles)
      .innerJoin(roles, eq(organizationUserRoles.roleId, roles.id))
      .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(
        and(
          eq(organizationUserRoles.userId, userId),
          eq(permissions.permission, permission),
        ),
      )
      .limit(1);

    return result.length > 0;
  } catch {
    return false;
  }
}

export async function hasScopedPermission(
  userId: string,
  permission: string,
  organizationId?: string,
) {
  if (!userId) {
    return false;
  }

  if (organizationId) {
    const orgAuthorized = await hasOrganizationPermission(
      userId,
      organizationId,
      permission,
    );

    if (orgAuthorized) {
      return true;
    }
  }

  return hasPermission(userId, permission);
}

export async function protectedPage(
  permission: string,
  redirectTo = "/dashboard",
) {
  const user = await getCurrentUser();

  if (!user?.id) {
    return redirect(redirectTo);
  }

  const [isAdmin, hasGlobalPermission, hasOrganizationScopedPermission] =
    await Promise.all([
      hasPermission(user.id, "system.create"),
      hasPermission(user.id, permission),
      hasAnyOrganizationPermission(user.id, permission),
    ]);

  const authorized = hasGlobalPermission || hasOrganizationScopedPermission;

  if (isAdmin) {
    return;
  }

  if (!authorized) {
    return redirect(redirectTo);
  }
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    const globalPermissions = await db
      .select({
        permission: permissions.permission,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(userRoles.userId, userId));

    const organizationPermissions = await db
      .select({
        permission: permissions.permission,
      })
      .from(organizationUserRoles)
      .innerJoin(roles, eq(organizationUserRoles.roleId, roles.id))
      .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(organizationUserRoles.userId, userId));

    return [
      ...new Set([
        ...globalPermissions.map((row) => row.permission),
        ...organizationPermissions.map((row) => row.permission),
      ]),
    ];
  } catch {
    return [];
  }
}

interface WithPermissionOptions<TArgs extends unknown[], TResult> {
  userId: string;
  permission: string;
  organizationId?: string;
  action: (...args: TArgs) => Promise<TResult>;
  onSuccess?: (res: TResult) => void;
  onError?: (error: string) => void;
}

export const withPermission = async <TArgs extends unknown[], TResult>(
  {
    userId,
    permission,
    organizationId,
    action,
  }: WithPermissionOptions<TArgs, TResult>,
  ...args: TArgs
): Promise<TResult | { error: string }> => {
  try {
    const authorized = await hasScopedPermission(
      userId,
      permission,
      organizationId,
    );

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
