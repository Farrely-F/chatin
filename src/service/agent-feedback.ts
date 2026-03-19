"use server";

import { db } from "@/db";
import { agentResponseFeedback } from "@/db/schema";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";

type CreateAgentResponseFeedback = {
  agentId: string;
  userId: string;
  assistantMessageId: string;
  isHelpful: boolean;
  userQuestion: string;
  agentResponse: string;
  expectedResponse?: string;
  feedbackNote?: string;
};

export async function createAgentResponseFeedback({
  agentId,
  userId,
  assistantMessageId,
  isHelpful,
  userQuestion,
  agentResponse,
  expectedResponse,
  feedbackNote,
}: CreateAgentResponseFeedback) {
  const normalizedExpected = expectedResponse?.trim() || null;
  const normalizedNote = feedbackNote?.trim() || null;

  if (!isHelpful && !normalizedExpected) {
    return { error: "Expected response is required for corrective feedback" };
  }

  await db.insert(agentResponseFeedback).values({
    agentId,
    userId,
    assistantMessageId,
    isHelpful,
    userQuestion: userQuestion.trim(),
    agentResponse: agentResponse.trim(),
    expectedResponse: normalizedExpected,
    feedbackNote: normalizedNote,
  });

  return { message: "Feedback submitted successfully" };
}

export type FeedbackGuidanceHint = {
  userQuestion: string;
  expectedResponse: string;
  feedbackNote: string | null;
};

function normalizeFeedbackText(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export async function getRecentAgentFeedbackHints(
  agentId: string,
  userId: string,
  limit = 5,
): Promise<FeedbackGuidanceHint[]> {
  const normalizedLimit = Math.max(1, Math.floor(limit));

  const rows = await db
    .select({
      userQuestion: agentResponseFeedback.userQuestion,
      expectedResponse: agentResponseFeedback.expectedResponse,
      feedbackNote: agentResponseFeedback.feedbackNote,
    })
    .from(agentResponseFeedback)
    .where(
      and(
        eq(agentResponseFeedback.agentId, agentId),
        eq(agentResponseFeedback.userId, userId),
        isNotNull(agentResponseFeedback.expectedResponse),
        sql`char_length(trim(${agentResponseFeedback.expectedResponse})) > 0`,
      ),
    )
    .orderBy(desc(agentResponseFeedback.createdAt))
    .limit(normalizedLimit);

  const unique = new Set<string>();
  const hints: FeedbackGuidanceHint[] = [];

  for (const row of rows) {
    const expectedResponse = row.expectedResponse || "";
    const dedupeKey = `${normalizeFeedbackText(row.userQuestion)}::${normalizeFeedbackText(expectedResponse)}`;

    if (unique.has(dedupeKey)) {
      continue;
    }

    unique.add(dedupeKey);
    hints.push({
      userQuestion: row.userQuestion,
      expectedResponse,
      feedbackNote: row.feedbackNote,
    });
  }

  return hints;
}

export type AgentFeedbackItem = {
  id: string;
  assistantMessageId: string;
  isHelpful: boolean;
  userQuestion: string;
  agentResponse: string;
  expectedResponse: string | null;
  feedbackNote: string | null;
  createdAt: Date | null;
};

export async function getAgentFeedbackList(
  agentId: string,
  userId: string,
): Promise<AgentFeedbackItem[]> {
  const rows = await db
    .select({
      id: agentResponseFeedback.id,
      assistantMessageId: agentResponseFeedback.assistantMessageId,
      isHelpful: agentResponseFeedback.isHelpful,
      userQuestion: agentResponseFeedback.userQuestion,
      agentResponse: agentResponseFeedback.agentResponse,
      expectedResponse: agentResponseFeedback.expectedResponse,
      feedbackNote: agentResponseFeedback.feedbackNote,
      createdAt: agentResponseFeedback.createdAt,
    })
    .from(agentResponseFeedback)
    .where(
      and(
        eq(agentResponseFeedback.agentId, agentId),
        eq(agentResponseFeedback.userId, userId),
      ),
    )
    .orderBy(desc(agentResponseFeedback.createdAt));

  return rows;
}

type UpdateAgentResponseFeedback = {
  feedbackId: string;
  agentId: string;
  userId: string;
  isHelpful: boolean;
  expectedResponse?: string;
  feedbackNote?: string;
};

export async function updateAgentResponseFeedback({
  feedbackId,
  agentId,
  userId,
  isHelpful,
  expectedResponse,
  feedbackNote,
}: UpdateAgentResponseFeedback) {
  const normalizedExpected = expectedResponse?.trim() || null;
  const normalizedNote = feedbackNote?.trim() || null;

  if (!isHelpful && !normalizedExpected) {
    return { error: "Expected response is required for corrective feedback" };
  }

  const [updated] = await db
    .update(agentResponseFeedback)
    .set({
      isHelpful,
      expectedResponse: isHelpful ? null : normalizedExpected,
      feedbackNote: normalizedNote,
    })
    .where(
      and(
        eq(agentResponseFeedback.id, feedbackId),
        eq(agentResponseFeedback.agentId, agentId),
        eq(agentResponseFeedback.userId, userId),
      ),
    )
    .returning({ id: agentResponseFeedback.id });

  if (!updated) {
    return { error: "Feedback not found" };
  }

  return { message: "Feedback updated successfully" };
}

export async function deleteAgentResponseFeedback(
  feedbackId: string,
  agentId: string,
  userId: string,
) {
  const [deleted] = await db
    .delete(agentResponseFeedback)
    .where(
      and(
        eq(agentResponseFeedback.id, feedbackId),
        eq(agentResponseFeedback.agentId, agentId),
        eq(agentResponseFeedback.userId, userId),
      ),
    )
    .returning({ id: agentResponseFeedback.id });

  if (!deleted) {
    return { error: "Feedback not found" };
  }

  return { message: "Feedback deleted successfully" };
}
