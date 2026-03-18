"use server";

import { getCurrentUser } from "@/lib/auth/auth";
import {
  deleteAgentResponseFeedback,
  getAgentFeedbackList,
  updateAgentResponseFeedback,
} from "@/service/agent-feedback";
import { getAgentById } from "@/service/agents";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";

export type AgentFeedbackClientItem = {
  id: string;
  assistantMessageId: string;
  isHelpful: boolean;
  userQuestion: string;
  agentResponse: string;
  expectedResponse: string | null;
  feedbackNote: string | null;
  createdAt: string | null;
};

type ActionResult<T = undefined> =
  | { status: true; data: T }
  | { status: false; error: string };

function toClientItems(
  rows: Awaited<ReturnType<typeof getAgentFeedbackList>>,
): AgentFeedbackClientItem[] {
  return rows.map((item) => ({
    id: item.id,
    assistantMessageId: item.assistantMessageId,
    isHelpful: item.isHelpful,
    userQuestion: item.userQuestion,
    agentResponse: item.agentResponse,
    expectedResponse: item.expectedResponse,
    feedbackNote: item.feedbackNote,
    createdAt: item.createdAt?.toISOString() ?? null,
  }));
}

export async function listAgentFeedbackAction(
  agentId: string,
): Promise<ActionResult<AgentFeedbackClientItem[]>> {
  const user = await getCurrentUser();

  if (!user?.id) {
    return { status: false, error: "Unauthorized" };
  }

  const agent = await getAgentById(agentId, user.id);
  if ("error" in agent) {
    return { status: false, error: agent.error };
  }

  const feedbacks = await getAgentFeedbackList(agentId, user.id);

  return { status: true, data: toClientItems(feedbacks) };
}

const updatePayloadSchema = z
  .object({
    agentId: z.uuid(),
    feedbackId: z.uuid(),
    isHelpful: z.boolean(),
    expectedResponse: z.string().trim().optional(),
    feedbackNote: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.isHelpful && !data.expectedResponse?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["expectedResponse"],
        message: "Expected response is required for corrective feedback",
      });
    }
  });

export async function updateAgentFeedbackAction(
  payload: z.infer<typeof updatePayloadSchema>,
): Promise<ActionResult<{ message: string }>> {
  const parsed = updatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      status: false,
      error: parsed.error.issues.at(0)?.message ?? "Invalid payload",
    };
  }

  const user = await getCurrentUser();
  if (!user?.id) {
    return { status: false, error: "Unauthorized" };
  }

  const result = await updateAgentResponseFeedback({
    feedbackId: parsed.data.feedbackId,
    agentId: parsed.data.agentId,
    userId: user.id,
    isHelpful: parsed.data.isHelpful,
    expectedResponse: parsed.data.expectedResponse,
    feedbackNote: parsed.data.feedbackNote,
  });

  if ("error" in result) {
    return {
      status: false,
      error: result.error || "Failed to update feedback",
    };
  }

  revalidatePath(`/dashboard/agents/${parsed.data.agentId}`);

  return { status: true, data: result };
}

const deletePayloadSchema = z.object({
  agentId: z.uuid(),
  feedbackId: z.uuid(),
});

export async function deleteAgentFeedbackAction(
  payload: z.infer<typeof deletePayloadSchema>,
): Promise<ActionResult<{ message: string }>> {
  const parsed = deletePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      status: false,
      error: parsed.error.issues.at(0)?.message ?? "Invalid payload",
    };
  }

  const user = await getCurrentUser();
  if (!user?.id) {
    return { status: false, error: "Unauthorized" };
  }

  const result = await deleteAgentResponseFeedback(
    parsed.data.feedbackId,
    parsed.data.agentId,
    user.id,
  );

  if ("error" in result) {
    return {
      status: false,
      error: result.error || "Failed to delete feedback",
    };
  }

  revalidatePath(`/dashboard/agents/${parsed.data.agentId}`);

  return { status: true, data: result };
}
