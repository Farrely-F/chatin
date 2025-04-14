"use server";

import { db } from "@/db";
import { chunkEmbeddings } from "@/db/schema/embeddings";
import { knowledgeBases } from "@/db/schema/knowledgebases";
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
  filePath: string,
) {
  try {
    // Delete the file from Supabase
    await supabase.storage.from("knowledge-base").remove([filePath]);

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
  const queryEmbedding = await generateEmbeddings(query);

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

export type KnowledgeBase = typeof knowledgeBases.$inferSelect;
