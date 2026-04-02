import { getEmbeddingCacheStats } from "@/lib/embedding-model";
import { generateStreamResponse, getLLMProvider } from "@/lib/llm";
import { canAccessAgentById, withAuth } from "@/middleware/api-middleware";
import { getRecentAgentFeedbackHints } from "@/service/agent-feedback";
import { getAgentWithKnowledgeBase } from "@/service/agents";
import { ApiHandlerArgs } from "@/types/api";
import { UIMessage } from "ai";
import { NextResponse } from "next/server";

async function postHandler(...args: ApiHandlerArgs) {
  const [req, { params }] = args;

  const body = (await req.json()) as {
    messages: UIMessage[];
    user_id?: string;
  };

  const { messages, user_id } = body;
  const { agentId } = await params;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { status: false, error: "Missing messages" },
      { status: 400 },
    );
  }

  const access = await canAccessAgentById(req, agentId);

  if (!access.allowed || !access.userId) {
    return NextResponse.json(
      { status: false, error: "Agent not found" },
      { status: 404 },
    );
  }

  const requestUserId = access.userId;

  if (user_id && user_id !== requestUserId) {
    return NextResponse.json(
      { status: false, error: "Unauthorized user context" },
      { status: 403 },
    );
  }

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
    feedbackGuidance: await getRecentAgentFeedbackHints(
      agentId,
      requestUserId,
      5,
    ),
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
}

export const POST = withAuth(postHandler, "chat");
