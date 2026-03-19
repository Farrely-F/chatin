"use server";

import { getCurrentUser } from "@/lib/auth/auth";
import { createAgentResponseFeedback } from "@/service/agent-feedback";
import { getAgentById } from "@/service/agents";
import { z } from "zod/v4";

const submitFeedbackSchema = z
  .object({
    agentId: z.uuid(),
    assistantMessageId: z.string().min(1),
    isHelpful: z.boolean(),
    userQuestion: z.string().trim().min(1),
    agentResponse: z.string().trim().min(1),
    expectedResponse: z.string().trim().optional(),
    feedbackNote: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.isHelpful && !data.expectedResponse?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Expected response is required for corrective feedback",
        path: ["expectedResponse"],
      });
    }
  });

export async function submitPlaygroundFeedbackAction(
  payload: z.infer<typeof submitFeedbackSchema>,
) {
  const parsed = submitFeedbackSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      status: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid feedback payload",
    };
  }

  const user = await getCurrentUser();
  if (!user?.id) {
    return { status: false as const, error: "Unauthorized" };
  }

  const agent = await getAgentById(parsed.data.agentId, user.id);
  if ("error" in agent) {
    return { status: false as const, error: agent.error };
  }

  const result = await createAgentResponseFeedback({
    agentId: parsed.data.agentId,
    userId: user.id,
    assistantMessageId: parsed.data.assistantMessageId,
    isHelpful: parsed.data.isHelpful,
    userQuestion: parsed.data.userQuestion,
    agentResponse: parsed.data.agentResponse,
    expectedResponse: parsed.data.expectedResponse,
    feedbackNote: parsed.data.feedbackNote,
  });

  if ("error" in result) {
    return { status: false as const, error: result.error };
  }

  return {
    status: true as const,
    message: result.message,
  };
}
