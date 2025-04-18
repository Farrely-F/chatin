import { db } from "@/db";
import { agents } from "@/db/schema";
import { slugify } from "@/lib/utils";
import { eq } from "drizzle-orm";

async function migrationSCript() {
  // example: populating slugs from existing names
  const res = await db.select().from(agents);

  for (const agent of res) {
    await db
      .update(agents)
      .set({ slug: slugify(agent.name) }) // use your slugify logic
      .where(eq(agents.id, agent.id));
  }
}

migrationSCript();
