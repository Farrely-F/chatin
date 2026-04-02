"use server";

import { db } from "@/db";
import { permissions, rolePermissions, roles } from "@/db/schema";
import { AddRoleSchema } from "@/schema/role-schema";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type RoleWithPermissions = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  permissions: { id: string; name: string | null; permission: string | null }[];
};

export async function getAllRoles() {
  try {
    const res = await db.select().from(roles);

    return res || [];
  } catch (error) {
    console.error(error);
    return {
      error: "Cannot process your request",
    };
  }
}

export async function getAllRolesWithPermission() {
  try {
    const res = await db
      .select({
        roleId: roles.id,
        roleName: roles.name,
        permissionId: permissions.id,
        permissionName: permissions.name,
        permission: permissions.permission,
        description: roles.description,
        createdAt: roles.createdAt,
        updatedAt: roles.updatedAt,
      })
      .from(roles)
      .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id));

    const grouped: RoleWithPermissions[] = [];

    for (const row of res) {
      const role = grouped.find((r) => r.id === row.roleId);
      const permission = row.permissionId
        ? {
            id: row.permissionId,
            name: row.permissionName,
            permission: row.permission,
          }
        : null;

      if (role) {
        if (
          permission &&
          !role.permissions.some((p) => p.id === permission.id)
        ) {
          role.permissions.push(permission);
        }
      } else {
        grouped.push({
          id: row.roleId,
          name: row.roleName,
          description: row.description,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          permissions: permission ? [permission] : [],
        });
      }
    }

    return grouped;
  } catch (error) {
    console.error(error);
  }
}

export async function createRoleWithPermissions(
  input: AddRoleSchema,
  permissionIds: string[],
) {
  try {
    return await db.transaction(async (trx) => {
      const [createdRole] = await trx
        .insert(roles)
        .values({
          ...input,
        })
        .returning();

      if (!createdRole) {
        throw new Error("Failed to create role");
      }

      const validPermissions = await trx
        .select()
        .from(permissions)
        .where(inArray(permissions.id, permissionIds));

      if (validPermissions.length !== permissionIds.length) {
        throw new Error("Some permission IDs are invalid");
      }

      const rolePermissionData = permissionIds.map((permId) => ({
        roleId: createdRole.id,
        permissionId: permId,
      }));

      await trx.insert(rolePermissions).values(rolePermissionData);

      revalidatePath("/dashboard", "layout");

      return {
        message: "Role created successfully",
      };
    });
  } catch (error) {
    if (error instanceof Error) {
      return {
        error: error.message,
      };
    }

    return {
      error: "Cannot process your request",
    };
  }
}

export async function updateRoleWithPermissions(
  id: string,
  input: AddRoleSchema,
  permissionIds: string[],
) {
  try {
    return await db.transaction(async (trx) => {
      const existingRole = await trx
        .select()
        .from(roles)
        .where(eq(roles.id, id));

      if (existingRole.length === 0) {
        throw new Error("Role not found");
      }

      const validPermissions = await trx
        .select({ id: permissions.id })
        .from(permissions)
        .where(inArray(permissions.id, permissionIds));

      if (validPermissions.length !== permissionIds.length) {
        throw new Error("Some permission IDs are invalid");
      }

      await trx
        .update(roles)
        .set({
          name: input.name,
          description: input.description,
          updatedAt: new Date(),
        })
        .where(eq(roles.id, id));

      await trx.delete(rolePermissions).where(eq(rolePermissions.roleId, id));

      if (permissionIds.length > 0) {
        await trx.insert(rolePermissions).values(
          permissionIds.map((permissionId) => ({
            roleId: id,
            permissionId,
          })),
        );
      }

      revalidatePath("/dashboard", "layout");

      return {
        message: "Role updated successfully",
      };
    });
  } catch (error) {
    if (error instanceof Error) {
      return {
        error: error.message,
      };
    }

    return {
      error: "Cannot process your request",
    };
  }
}

export async function deleteRole(id: string) {
  try {
    await db.delete(roles).where(eq(roles.id, id));

    revalidatePath("/dashboard", "layout");

    return { message: "Role deleted successfully" };
  } catch (error) {
    console.error(error);
    return { error: "Cannot process your request" };
  }
}

export type RoleDetails = typeof roles.$inferSelect;
