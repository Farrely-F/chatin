import { getEmbeddingCacheStats } from "@/lib/embedding-model";
import { generateStreamResponse, getLLMProvider } from "@/lib/llm";
import { withAuth } from "@/middleware/api-middleware";
import {
  invalidPublicChatBodyMessage,
  parsePublicChatBody,
} from "@/schema/public-chat-schema";
import { getRecentAgentFeedbackHints } from "@/service/agent-feedback";
import { getAgentWithKnowledgeBase } from "@/service/agents";
import { ApiHandlerArgs } from "@/types/api";
import { NextResponse } from "next/server";

async function postHandler(...args: ApiHandlerArgs) {
  const [req, { params }] = args;

  try {
    const body = parsePublicChatBody(await req.json());

    if (!body.success) {
      return NextResponse.json(
        {
          status: false,
          error: invalidPublicChatBodyMessage,
        },
        { status: 400 },
      );
    }

    const { messages, user_id } = body.data;
    const { agentId } = await params;

    const requestUserId = req.authorized?.userId || user_id || "";

    const agentConfig = await getAgentWithKnowledgeBase(agentId, requestUserId);

    if ("error" in agentConfig) {
      return NextResponse.json(
        { status: false, error: agentConfig.error },
        { status: 400 },
      );
    }

    if (agentConfig.model.isAvailable === false) {
      return NextResponse.json(
        { status: false, error: "Model is not available" },
        { status: 400 },
      );
    }

    const model = getLLMProvider(agentConfig.model);
    const response = generateStreamResponse({
      model,
      agentConfig,
      messages,
      agentId,
      requestUserId,
      feedbackGuidance: requestUserId
        ? await getRecentAgentFeedbackHints(agentId, requestUserId, 5)
        : [],
    });

    return response.toUIMessageStreamResponse({
      originalMessages: messages,
      generateMessageId: () => crypto.randomUUID(),
      messageMetadata: ({ part }) => {
        if (part.type === "finish") {
          const inputTokens = part.totalUsage.inputTokens ?? 0;
          const cachedInputTokens = part.totalUsage.cachedInputTokens ?? 0;
          const embeddingCacheStats = getEmbeddingCacheStats();

          return {
            totalUsage: part.totalUsage,
            cache: {
              inputTokens,
              cachedInputTokens,
              hitRate:
                inputTokens > 0 ? cachedInputTokens / inputTokens : undefined,
            },
            embeddingCache: {
              hitRate: embeddingCacheStats.hitRate,
              size: embeddingCacheStats.stats.size,
            },
          };
        }

        return undefined;
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { status: false, error: "Something went wrong" },
      { status: 500 },
    );
  }
}

export const POST = withAuth(postHandler, "chat");
