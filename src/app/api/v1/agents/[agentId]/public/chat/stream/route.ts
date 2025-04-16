import { verifyJWT } from "@/lib/jwt";
import { generateStreamResponse, getLLMProvider } from "@/lib/llm";
import { getAgentWithKnowledgeBase } from "@/service/agents";
import { NextRequest, NextResponse } from "next/server";

const AUHTORIZED_DOMAIN = process.env.AUTHORIZED_DOMAIN!;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  try {
    const body = await req.json();
    const host = req.headers.get("host");

    if (!host?.includes(AUHTORIZED_DOMAIN)) {
      const token = req.headers.get("Authorization")?.split("Bearer ")[1];

      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const isValidToken = await verifyJWT(token || "");

      if (!isValidToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { messages, user_id } = body;
    const { agentId } = await params;

    if (!user_id) {
      return NextResponse.json(
        { error: "Agent for related user is not found" },
        { status: 400 },
      );
    }

    if (!messages) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    const agentConfig = await getAgentWithKnowledgeBase(agentId, user_id || "");

    if ("error" in agentConfig) {
      return NextResponse.json({ error: agentConfig.error }, { status: 400 });
    }

    const model = getLLMProvider(agentConfig.llmProvider);
    const response = generateStreamResponse({
      model,
      agentConfig,
      messages,
      agentId,
    });

    return response.toDataStreamResponse();
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
