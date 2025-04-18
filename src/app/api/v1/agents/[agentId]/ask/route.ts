import { auth } from "@/lib/auth/auth";
import { verifyJWT } from "@/lib/jwt";
import { searchSimilarChunks } from "@/lib/similarity-search";
import { getAgentById } from "@/service/agents";
import { getAllKnowledgeBases } from "@/service/knowledgebases";
import { google } from "@ai-sdk/google";
import { streamText, tool } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const model = google("gemini-2.0-flash-001");

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const body = await req.json();

  const session = await auth();

  if (!session?.user) {
    const token = req.headers.get("Authorization")?.split("Bearer ")[1];

    console.log(token);

    const isValidToken = await verifyJWT(token || "");

    if (!isValidToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { messages, top_k = 5, user_id } = body;
  const { agentId } = await params;

  if (!user_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 400 });
  }

  if (!messages) {
    return NextResponse.json(
      { error: "Missing query or knowledgeBaseId" },
      { status: 400 },
    );
  }

  const agentConfig = await getAgentById(agentId, user_id || "");
  const [relatedKnowledgeBase] = await getAllKnowledgeBases(agentId);

  if ("error" in agentConfig) {
    return NextResponse.json({ error: agentConfig.error }, { status: 400 });
  }

  // 3. Stream answer from LLM
  const response = streamText({
    model,
    system: `
    You are ${agentConfig.name}
    Always Check your knowledge base before answering any questions. Only respond to questions using information from tool calls.

    Additional Instructions:
    ${agentConfig.systemPrompt}
    
    System Information:
    - Agent Name: ${agentConfig.name}
    - Agent ID: ${agentConfig.id}
    - Knowledge Base ID: ${relatedKnowledgeBase?.id || "No knowledge base"}
    `,
    messages,
    temperature: agentConfig.temperature || 0.7,
    tools: {
      retrieve_context: tool({
        description:
          "Retrieve context from knowledge base to answer question that you might not know",
        parameters: z.object({}),
        execute: async () => {
          const context = await searchSimilarChunks({
            query: messages[messages.length - 1].content,
            agentId,
            knowledgeBaseId: relatedKnowledgeBase.id,
            topK: top_k,
            similarityThreshold: agentConfig.similarityThreshold || 0.5,
          });
          console.log("calling tools");
          return context;
        },
      }),
    },
    topK: agentConfig.topK || 5,
    topP: agentConfig.topP || 1,
    onError: (error) => console.error(error),
  });

  return response.toDataStreamResponse();
}
