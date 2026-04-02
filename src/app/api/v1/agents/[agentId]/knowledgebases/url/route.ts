import { db } from "@/db";
import { knowledgeBases } from "@/db/schema";
import { recursiveCrawl } from "@/lib/web-crawler";
import { canAccessAgentById, withAuth } from "@/middleware/api-middleware";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

async function postHandler(
  req: Request & {
    json: () => Promise<unknown>;
    authorized?: { userId?: string };
  },
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { url, name, maxDepth = 2 } = await req.json();

  const { agentId } = await params;

  const access = await canAccessAgentById(req as never, agentId);

  if (!access.allowed || !access.userId) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const agent = await db.query.agents.findFirst({
    where: (a, { eq }) => eq(a.id, agentId),
    columns: { id: true, organizationId: true },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  try {
    const res = await db.transaction(async (trx) => {
      const [{ id: knowledgeBaseId }] = await trx
        .insert(knowledgeBases)
        .values({
          fileName: name || `Website - ${url}`,
          sourceType: "url",
          sourceUrl: url,
          agentId,
        })
        .returning({ id: knowledgeBases.id });

      const visited = new Set<string>();
      await recursiveCrawl(url, visited, 0, {
        maxDepth,
        knowledgeBaseId,
        agentId,
        organizationId: agent.organizationId ?? undefined,
        requestUserId: access.userId,
        trx,
      });

      await trx
        .update(knowledgeBases)
        .set({ embeddingStatus: "success" })
        .where(eq(knowledgeBases.id, knowledgeBaseId));

      return NextResponse.json(
        {
          message: "Crawl completed successfully",
        },
        { status: 200 },
      );
    });

    return res;
  } catch (error) {
    console.error("crawl error", error);
    return NextResponse.json({ error: "Crawl failed" }, { status: 500 });
  }
}

export const POST = withAuth(postHandler, "write");
