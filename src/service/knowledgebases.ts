"use server";

import { db } from "@/db";
import { chunkEmbeddings } from "@/db/schema/embeddings";
import { knowledgeBases } from "@/db/schema/knowledgebases";
import { invalidateEmbeddingCache } from "@/lib/embedding-cache";
import { generateEmbeddings } from "@/lib/embedding-model";
import { supabase } from "@/lib/supabase/client";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getAllKnowledgeBases(agentId: string) {
  const res = await db
    .select()
    .from(knowledgeBases)
    .where(eq(knowledgeBases.agentId, agentId));

  if (!res.length) {
    return [];
  }

  return res;
}

export async function deleteKnowledgeBaseById(
  agentId: string,
  knowledgeBaseId: string,
  type: string,
  filePath: string,
) {
  try {
    // Delete the file from Supabase
    if (type === "pdf") {
      await supabase.storage.from("knowledge-base").remove([filePath]);
    }

    // Delete the knowledge base and associated embeddings
    await db.transaction(async (trx) => {
      await trx
        .delete(chunkEmbeddings)
        .where(eq(chunkEmbeddings.knowledgeBaseId, knowledgeBaseId));

      await trx
        .delete(knowledgeBases)
        .where(
          and(
            eq(knowledgeBases.id, knowledgeBaseId),
            eq(knowledgeBases.agentId, agentId),
          ),
        );
    });

    revalidatePath(`/dashboard/agents/${agentId}`);

    invalidateEmbeddingCache();

    return { message: "Knowledge base deleted successfully" };
  } catch (error) {
    console.error("Error deleting knowledge base:", error);
    return { error: "Failed to delete knowledge base" };
  }
}

export async function similaritySearch(
  query: string,
  agentId: string,
  knowledgeBaseId: string,
  topK = 5,
) {
  const queryEmbedding = await generateEmbeddings(query, {
    agentId,
    source: "embedding",
  });

  const similarChunks = await db
    .select({
      id: chunkEmbeddings.id,
      content: chunkEmbeddings.contentChunk,
    })
    .from(chunkEmbeddings)
    .where(
      and(
        eq(chunkEmbeddings.agentId, agentId),
        eq(chunkEmbeddings.knowledgeBaseId, knowledgeBaseId),
      ),
    )
    .orderBy(sql`embedding_vector <-> ${queryEmbedding}`)
    .limit(topK);

  const contextText = similarChunks.map((c) => c.content).join("\n\n");

  return contextText;
}

export async function getAllKnowledgeChunks(
  agentId: string,
  knowledgeBaseId: string,
) {
  const res = await db
    .select({
      id: chunkEmbeddings.id,
      content: chunkEmbeddings.contentChunk,
      tokenCount: chunkEmbeddings.tokenCount,
    })
    .from(chunkEmbeddings)
    .where(
      and(
        eq(chunkEmbeddings.agentId, agentId),
        eq(chunkEmbeddings.knowledgeBaseId, knowledgeBaseId),
      ),
    );

  if (!res.length) {
    return [];
  }

  return res;
}

export async function probeKnowledgeChunks(
  query: string,
  agentId: string,
  knowledgeBaseId: string,
  topK = 10,
) {
  const cleanedQuery = query.trim();

  if (!cleanedQuery) {
    return [];
  }

  const queryEmbedding = await generateEmbeddings(cleanedQuery, {
    agentId,
    source: "embedding",
  });
  const embeddingVectorLiteral = `[${queryEmbedding.join(",")}]`;

  const rows = await db
    .select({
      id: chunkEmbeddings.id,
      content: chunkEmbeddings.contentChunk,
      tokenCount: chunkEmbeddings.tokenCount,
      distance: sql<number>`${chunkEmbeddings.embeddingVector} <-> ${embeddingVectorLiteral}::vector`,
    })
    .from(chunkEmbeddings)
    .where(
      and(
        eq(chunkEmbeddings.agentId, agentId),
        eq(chunkEmbeddings.knowledgeBaseId, knowledgeBaseId),
      ),
    )
    .orderBy(
      sql`${chunkEmbeddings.embeddingVector} <-> ${embeddingVectorLiteral}::vector`,
    )
    .limit(topK);

  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    tokenCount: row.tokenCount,
    distance: row.distance,
    similarityScore: Number((1 / (1 + row.distance)).toFixed(4)),
  }));
}

export async function getAllAgentKnowledgeChunks(agentId: string) {
  const rows = await db
    .select({
      id: chunkEmbeddings.id,
      content: chunkEmbeddings.contentChunk,
      tokenCount: chunkEmbeddings.tokenCount,
      knowledgeBaseId: chunkEmbeddings.knowledgeBaseId,
      sourceType: knowledgeBases.sourceType,
      fileName: knowledgeBases.fileName,
      createdAt: knowledgeBases.createdAt,
    })
    .from(chunkEmbeddings)
    .innerJoin(
      knowledgeBases,
      eq(chunkEmbeddings.knowledgeBaseId, knowledgeBases.id),
    )
    .where(eq(chunkEmbeddings.agentId, agentId));

  if (!rows.length) {
    return [];
  }

  return rows;
}

export async function probeAgentKnowledgeChunks(
  query: string,
  agentId: string,
  topK = 10,
) {
  const cleanedQuery = query.trim();

  if (!cleanedQuery) {
    return [];
  }

  const queryEmbedding = await generateEmbeddings(cleanedQuery, {
    agentId,
    source: "embedding",
  });
  const embeddingVectorLiteral = `[${queryEmbedding.join(",")}]`;

  const rows = await db
    .select({
      id: chunkEmbeddings.id,
      content: chunkEmbeddings.contentChunk,
      tokenCount: chunkEmbeddings.tokenCount,
      knowledgeBaseId: chunkEmbeddings.knowledgeBaseId,
      sourceType: knowledgeBases.sourceType,
      fileName: knowledgeBases.fileName,
      createdAt: knowledgeBases.createdAt,
      distance: sql<number>`${chunkEmbeddings.embeddingVector} <-> ${embeddingVectorLiteral}::vector`,
    })
    .from(chunkEmbeddings)
    .innerJoin(
      knowledgeBases,
      eq(chunkEmbeddings.knowledgeBaseId, knowledgeBases.id),
    )
    .where(eq(chunkEmbeddings.agentId, agentId))
    .orderBy(
      sql`${chunkEmbeddings.embeddingVector} <-> ${embeddingVectorLiteral}::vector`,
    )
    .limit(topK);

  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    tokenCount: row.tokenCount,
    knowledgeBaseId: row.knowledgeBaseId,
    sourceType: row.sourceType,
    fileName: row.fileName,
    createdAt: row.createdAt,
    distance: row.distance,
    similarityScore: Number((1 / (1 + row.distance)).toFixed(4)),
  }));
}

export type KnowledgeChunk = Awaited<
  ReturnType<typeof getAllKnowledgeChunks>
>[number];

export type KnowledgeProbeResult = Awaited<
  ReturnType<typeof probeKnowledgeChunks>
>[number];

export type AgentKnowledgeChunk = Awaited<
  ReturnType<typeof getAllAgentKnowledgeChunks>
>[number];

export type AgentKnowledgeProbeResult = Awaited<
  ReturnType<typeof probeAgentKnowledgeChunks>
>[number];

export type KnowledgeBase = typeof knowledgeBases.$inferSelect;
