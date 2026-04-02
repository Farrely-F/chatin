import { generateTextResponse, getLLMProvider } from "@/lib/llm";
import { canAccessAgentById, withAuth } from "@/middleware/api-middleware";
import {
  invalidPublicChatBodyMessage,
  parsePublicChatBody,
} from "@/schema/public-chat-schema";
import { getAgentWithKnowledgeBase } from "@/service/agents";
import { NextRequest, NextResponse } from "next/server";

async function postHandler(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
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
      return NextResponse.json({ error: agentConfig.error }, { status: 400 });
    }

    if (agentConfig.model.isAvailable === false) {
      return NextResponse.json(
        { status: false, error: "Model is not available" },
        { status: 400 },
      );
    }

    const model = getLLMProvider(agentConfig.model);
    const { response } = await generateTextResponse({
      model,
      agentConfig,
      messages,
      agentId,
      requestUserId,
    });

    if (!response) {
      return NextResponse.json(
        { status: false, error: "Something went wrong" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        status: true,
        timestamp: response.timestamp,
        messages: response.messages,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { status: false, error: "Something went wrong" },
      { status: 500 },
    );
  }
}

export const POST = withAuth(postHandler, "chat");
