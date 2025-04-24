import { generateTextResponse, getLLMProvider } from "@/lib/llm";
import { withAuth } from "@/middleware/api-middleware";
import { getAgentWithKnowledgeBase } from "@/service/agents";
import { NextRequest, NextResponse } from "next/server";

async function postHandler(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  try {
    const body = await req.json();

    const { messages, user_id } = body;
    const { agentId } = await params;

    if (!messages) {
      return NextResponse.json(
        { status: false, error: "Invalid message" },
        { status: 400 },
      );
    }

    const agentConfig = await getAgentWithKnowledgeBase(agentId, user_id);

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
