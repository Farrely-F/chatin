"use server";

import { db } from "@/db";
import { roles, userRoles, users } from "@/db/schema";
import { hasPermission } from "@/lib/check-permission";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { RoleDetails } from "./roles";

export type UserWithRoles = {
  id: string;
  email: string;
  name: string | null;
  authProvider: "email" | "google" | null;
  roles?: RoleDetails[];
  createdAt: Date | null;
};

export async function getAllUsersWithRoles() {
  try {
    const res = await db
      .select()
      .from(users)
      .leftJoin(userRoles, eq(users.id, userRoles.userId))
      .leftJoin(roles, eq(userRoles.roleId, roles.id));

    const grouped: UserWithRoles[] = [];

    for (const row of res) {
      const user = grouped.find((u) => u.id === row.users.id);
      const role = row.roles
        ? {
            id: row.roles.id,
            name: row.roles.name,
            description: row.roles.description,
            createdAt: row.roles.createdAt,
            updatedAt: row.roles.updatedAt,
          }
        : undefined;

      if (user) {
        if (role) {
          user.roles = [...(user.roles || []), role];
        }
      } else {
        grouped.push({
          id: row.users.id,
          email: row.users.email,
          name: row.users.name,
          authProvider: row.users.authProvider,
          roles: role ? [role] : undefined,
          createdAt: row.users.createdAt,
        });
      }
    }

    return grouped || [];
  } catch (error) {
    console.error(error);
    return { error: "Cannot process your request" };
  }
}

export async function createUser(
  userId: string,
  data: typeof users.$inferInsert,
) {
  const authorized = await hasPermission(userId, "system.create");

  if (!authorized) {
    return { error: "Unauthorized" };
  }

  try {
    const [newUser] = await db.insert(users).values(data).returning();

    revalidatePath("/dashboard/user-management");

    return {
      message: `User ${newUser.email} created successfully`,
    };
  } catch (error) {
    console.error(error);
    return { error: "Cannot process your request" };
  }
}

export async function assignRoleToUser(userId: string, roleIds: string[]) {
  try {
    await db.transaction(async (trx) => {
      await trx.delete(userRoles).where(eq(userRoles.userId, userId));
      for (const roleId of roleIds) {
        await trx.insert(userRoles).values({ userId, roleId });
      }
    });

    revalidatePath("/dashboard/user-management");

    return { message: "Successfully assigned role to user" };
  } catch (error) {
    console.error(error);
    return { error: "Cannot process your request" };
  }
}

export async function deleteUser(userId: string) {
  try {
    await db.delete(users).where(eq(users.id, userId));

    revalidatePath("/dashboard/user-management");

    return { message: "User deleted successfully" };
  } catch (error) {
    console.error(error);
    return { error: "Cannot process your request" };
  }
}
