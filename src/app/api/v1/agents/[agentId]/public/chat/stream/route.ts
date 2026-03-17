import { generateStreamResponse, getLLMProvider } from "@/lib/llm";
import { withAuth } from "@/middleware/api-middleware";
import { getAgentWithKnowledgeBase } from "@/service/agents";
import { ApiHandlerArgs } from "@/types/api";
import { UIMessage } from "ai";
import { NextResponse } from "next/server";

async function postHandler(...args: ApiHandlerArgs) {
  const [req, { params }] = args;

  try {
    const body = await req.json();

    const { messages, user_id } = body as {
      messages: UIMessage[];
      user_id?: string;
    };
    const { agentId } = await params;

    if (!messages) {
      return NextResponse.json(
        { status: false, error: "Invalid message" },
        { status: 400 },
      );
    }

    const agentConfig = await getAgentWithKnowledgeBase(
      agentId,
      req.authorized?.userId || user_id || "",
    );

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
    });

    return response.toUIMessageStreamResponse({
      originalMessages: messages,
      generateMessageId: () => crypto.randomUUID(),
      messageMetadata: ({ part }) => {
        if (part.type === "finish") {
          return { totalUsage: part.totalUsage };
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
