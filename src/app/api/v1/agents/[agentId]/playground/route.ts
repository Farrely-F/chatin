import { auth } from "@/lib/auth/auth";
import { getEmbeddingCacheStats } from "@/lib/embedding-model";
import { generateStreamResponse, getLLMProvider } from "@/lib/llm";
import { getRecentAgentFeedbackHints } from "@/service/agent-feedback";
import { getAgentWithKnowledgeBase } from "@/service/agents";
import { verifyApiKey } from "@/service/api-key";
import { UIMessage } from "ai";
import { NextRequest, NextResponse } from "next/server";

const AUHTORIZED_DOMAIN = process.env.AUTHORIZED_DOMAIN ?? "";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const body = await req.json();
  const host = req.headers.get("host");

  const { messages, user_id } = body as {
    messages: UIMessage[];
    user_id?: string;
  };
  const { agentId } = await params;

  const session = await auth();

  if (!session?.user || !host?.includes(AUHTORIZED_DOMAIN)) {
    const token = req.headers.get("Authorization")?.split("Bearer ")[1];

    if (!token) {
      return NextResponse.json(
        { status: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const isValidToken = await verifyApiKey(token);

    if (!isValidToken) {
      return NextResponse.json(
        { status: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
  }

  if (!user_id) {
    return NextResponse.json(
      { status: false, error: "Unauthorized" },
      { status: 400 },
    );
  }

  const agentConfig = await getAgentWithKnowledgeBase(agentId, user_id || "");

  if ("error" in agentConfig) {
    return NextResponse.json(
      { status: false, error: agentConfig.error },
      { status: 400 },
    );
  }

  if (agentConfig.model.isAvailable === false) {
    return NextResponse.json(
      { error: "Model is not available" },
      { status: 400 },
    );
  }

  const model = getLLMProvider(agentConfig.model);

  if (!messages) {
    return NextResponse.json(
      { status: false, error: "Missing messages" },
      { status: 400 },
    );
  }

  const response = generateStreamResponse({
    model,
    agentConfig,
    messages,
    agentId,
    requestUserId: user_id,
    feedbackGuidance: await getRecentAgentFeedbackHints(agentId, user_id, 5),
  });

  if ("error" in response) {
    return NextResponse.json(
      { status: false, error: response.error },
      { status: 500 },
    );
  }

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
