import { db } from "@/db";
import { agents } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getAllAgents(userId: string) {
  const res = await db.select().from(agents).where(eq(agents.userId, userId));
  return res;
}
