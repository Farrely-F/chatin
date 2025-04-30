"use server";

import { db } from "@/db";
import { permissions } from "@/db/schema";
import { AddPermissionSchema } from "@/schema/permission-schema";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getAllPermissions() {
  const res = await db.select().from(permissions);
  return res || [];
}

export async function getPermissionById() {}

export async function createPermission(data: AddPermissionSchema) {
  try {
    await db.insert(permissions).values({ ...data });

    revalidatePath("/dashboard", "layout");

    return {
      message: "Permission created successfully",
    };
  } catch (error) {
    console.error(error);
    return {
      error: "Cannot process your request",
    };
  }
}

export async function deletePermission(id: string) {
  try {
    await db.delete(permissions).where(eq(permissions.id, id));

    revalidatePath("/dashboard", "layout");

    return {
      message: "Permission deleted successfully",
    };
  } catch (error) {
    console.error(error);
    return {
      error: "Cannot process your request",
    };
  }
}

export async function batchDeletePermission(id: string[]) {
  try {
    await db.delete(permissions).where(inArray(permissions.id, id));

    revalidatePath("/dashboard", "layout");

    return {
      message: "Permissions deleted successfully",
    };
  } catch (error) {
    console.error(error);
    return {
      error: "Cannot process your request",
    };
  }
}

export type Permissions = typeof permissions.$inferSelect;
