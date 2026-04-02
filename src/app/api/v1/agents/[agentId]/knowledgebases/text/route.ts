import { db } from "@/db";
import { chunkEmbeddings, knowledgeBases } from "@/db/schema";
import { generateMultipleEmbeddings } from "@/lib/embedding-model";
import { splitIntoChunks } from "@/lib/text-chunker";
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
  const { title, content } = await req.json();
  const { agentId } = await params;

  const access = await canAccessAgentById(req as never, agentId);

  if (!access.allowed || !access.userId) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  if (!title || !content) {
    return NextResponse.json(
      { error: "Missing name or text" },
      { status: 400 },
    );
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
          agentId,
          sourceType: "txt",
          fileName: title,
          contentText: content,
        })
        .returning({ id: knowledgeBases.id });

      if (!knowledgeBaseId) {
        return NextResponse.json(
          { error: "Failed to create knowledge base" },
          { status: 500 },
        );
      }

      const chunks = await splitIntoChunks(content as string, {
        chunkSize: 500,
        type: "html",
      });

      const embeddings = await generateMultipleEmbeddings(chunks, {
        agentId,
        organizationId: agent.organizationId ?? undefined,
        requestUserId: access.userId,
        source: "embedding",
      });

      const chunkRows = chunks.map((chunk, index) => ({
        agentId,
        knowledgeBaseId,
        contentChunk: chunk,
        embeddingVector: embeddings[index],
        tokenCount: chunk.split(" ").length,
      }));

      const [{ id: chunkEmbeddingId }] = await trx
        .insert(chunkEmbeddings)
        .values(chunkRows)
        .returning({ id: chunkEmbeddings.id });

      if (!chunkEmbeddingId) {
        return NextResponse.json(
          { error: "Failed to create chunk embeddings" },
          { status: 500 },
        );
      }

      await trx
        .update(knowledgeBases)
        .set({ embeddingStatus: "success" })
        .where(eq(knowledgeBases.id, knowledgeBaseId));

      return NextResponse.json(
        { success: true, message: "Knowledge base created successfully" },
        { status: 200 },
      );
    });

    return res;
  } catch (error) {
    console.error("Error creating knowledge base:", error);
    return NextResponse.json(
      { error: "Error creating knowledge base" },
      { status: 500 },
    );
  }
}

export const POST = withAuth(postHandler, "write");
