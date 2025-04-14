import { auth } from "@/lib/auth/auth";
import { verifyJWT } from "@/lib/jwt";
import { getLLMProvider } from "@/lib/llm";
import { searchSimilarChunks } from "@/lib/similarity-search";
import { getAgentById } from "@/service/agents";
import {
  getAllKnowledgeBases,
  getAllKnowledgeChunks,
} from "@/service/knowledgebases";
import { streamText, tool } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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

  const { messages, user_id } = body;
  const { agentId } = await params;

  if (!user_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 400 });
  }

  const agentConfig = await getAgentById(agentId, user_id || "");
  const [relatedKnowledgeBase] = await getAllKnowledgeBases(agentId);

  if ("error" in agentConfig) {
    return NextResponse.json({ error: agentConfig.error }, { status: 400 });
  }

  const model = getLLMProvider(agentConfig.llmProvider);

  if (!messages) {
    return NextResponse.json(
      { error: "Missing query or knowledgeBaseId" },
      { status: 400 },
    );
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
            topK: agentConfig.topK || 5,
            similarityThreshold: agentConfig.similarityThreshold || 0.5,
          });
          console.log("calling tools");
          return context;
        },
      }),
      retrieve_whole_knowledge_base: tool({
        description:
          "Retrieve the whole knowledge base chunks, use this to answer questions that need whole knowledge base context, such as summarization, translation, etc.",
        parameters: z.object({}),
        execute: async () => {
          const context = await getAllKnowledgeChunks(
            agentId,
            relatedKnowledgeBase.id,
          );
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
