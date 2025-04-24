import { db } from "@/db";
import { knowledgeBases } from "@/db/schema";
import { recursiveCrawl } from "@/lib/web-crawler";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { url, name, maxDepth = 2 } = await req.json();

  const { agentId } = await params;

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
      await recursiveCrawl(
        url,
        maxDepth,
        visited,
        knowledgeBaseId,
        agentId,
        trx,
      );

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
