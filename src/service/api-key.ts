"use server";

import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { compare, hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getApiKeys(userId: string) {
  return db.query.apiKeys.findMany({
    where: eq(apiKeys.userId, userId),
    orderBy: (apiKeys, { desc }) => [desc(apiKeys.createdAt)],
  });
}

export async function getApiKeyById(id: string) {
  return db.query.apiKeys.findFirst({
    where: eq(apiKeys.id, id),
  });
}

export async function verifyApiKey(apiKeyString: string) {
  // Extract prefix (first 8 chars) to find potential matches
  const prefix = apiKeyString.substring(0, 8);
  const rest = apiKeyString.substring(9).replace(/-/g, "");

  // Find all keys with matching prefix
  const potentialKeys = await db.query.apiKeys.findMany({
    where: (apiKeys, { like }) => like(apiKeys.key, `${prefix}%`),
  });

  // Check each potential key
  for (const key of potentialKeys) {
    // Skip revoked or expired keys
    if (key.revoked) continue;
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) continue;

    const hashedKey = key.key.substring(9).replace(/-/g, "");

    // Compare the hashed key
    const isMatch = await compare(rest, hashedKey);
    if (isMatch) {
      return key;
    }
  }

  return null;
}

export async function generateApiKey() {
  // Generate a random UUID and format it as an API key
  const uuid = randomUUID();
  const prefix = uuid.substring(0, 8);
  const rest = uuid.substring(9).replace(/-/g, "");

  return {
    key: `${prefix}-${rest}`,
    prefix,
    rest,
  };
}

export async function createApiKey({
  userId,
  name,
  scopes = ["chat"],
  expiresAt = null,
}: {
  userId: string;
  name: string;
  scopes?: string[];
  expiresAt: string | null;
}) {
  try {
    // Generate a new API key
    const apiKeyString = await generateApiKey();

    // Hash the API key for storage
    const hashedKey = await hash(apiKeyString.rest, 10);

    // Store the hashed key in the database
    await db.insert(apiKeys).values({
      userId,
      key: apiKeyString.prefix + "-" + hashedKey,
      name,
      scopes,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    revalidatePath("/dashboard/api-keys");

    // Return the plain text key to show to the user (only once)
    return { success: true, key: apiKeyString };
  } catch (error) {
    console.error("Failed to create API key:", error);
    return { success: false, error: "Failed to create API key" };
  }
}

export async function revokeApiKey(apiKeyId: string) {
  try {
    await db
      .update(apiKeys)
      .set({ revoked: true })
      .where(eq(apiKeys.id, apiKeyId));

    revalidatePath("/dashboard/api-keys");
    return { message: "API key revoked successfully" };
  } catch (error) {
    console.error("Failed to revoke API key:", error);
    return { error: "Failed to revoke API key" };
  }
}

export async function deleteApiKey(apiKeyId: string) {
  try {
    await db.delete(apiKeys).where(eq(apiKeys.id, apiKeyId));

    revalidatePath("/dashboard/api-keys");
    return { message: "API key deleted successfully" };
  } catch (error) {
    console.error("Failed to delete API key:", error);
    return { error: "Failed to delete API key" };
  }
}
