import { AgentWithKnowledgeBase } from "@/service/agents";
import { getAllKnowledgeChunks } from "@/service/knowledgebases";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import {
  CoreMessage,
  LanguageModelV1,
  generateText,
  streamText,
  tool,
} from "ai";
import { z } from "zod";

import { searchSimilarChunks } from "./similarity-search";

type SupportedProviders = "openai" | "google" | "anthropic";

const MODEL_MAP: Record<SupportedProviders, string> = {
  openai: "gpt-4-turbo",
  google: "gemini-2.0-flash-001",
  anthropic: "claude-3-5-haiku-20241022",
};

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export function getLLMProvider(provider: SupportedProviders) {
  switch (provider) {
    case "openai":
      return openai(MODEL_MAP.openai);
    case "google":
      return google(MODEL_MAP.google);
    case "anthropic":
      return anthropic(MODEL_MAP.anthropic);
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

function generateSysPrompt(agentConfig: AgentWithKnowledgeBase) {
  if ("error" in agentConfig) {
    throw new Error(agentConfig.error);
  }

  return `
  You are ${agentConfig.name}
  Always Check your knowledge base before answering any questions. Only respond to questions using information from tool calls.

  Additional Instructions:
  ${agentConfig.systemPrompt}
  
  System Information:
  - Agent Name: ${agentConfig.name}

  Persona:
  ${
    agentConfig?.personas
      ? `
    - Sex: ${agentConfig?.personas?.sex}
    - Answer Preference: ${agentConfig?.personas?.answerPreference}
    - Formality: ${agentConfig?.personas?.formality}
    - Emoji Usage: ${agentConfig?.personas?.emojiUsage}
    - Default Language: ${agentConfig?.personas?.defaultLanguage}
    `
      : "No Persona Attached"
  } 
  `;
}

export function generateStreamResponse({
  model,
  agentConfig,
  messages,
  agentId,
}: {
  model: LanguageModelV1;
  agentConfig: AgentWithKnowledgeBase;
  messages: CoreMessage[];
  agentId: string;
}) {
  if ("error" in agentConfig) {
    throw new Error(agentConfig.error);
  }

  const response = streamText({
    model,
    system: generateSysPrompt(agentConfig),
    messages,
    temperature: agentConfig.temperature || 0.7,
    tools: {
      retrieve_context: tool({
        description:
          "Retrieve context from knowledge base to answer question that you might not know",
        parameters: z.object({}),
        execute: async () => {
          const context = await searchSimilarChunks({
            query: messages[messages.length - 1].content as string,
            agentId,
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
          const context = await getAllKnowledgeChunks(agentId);
          return context;
        },
      }),
    },
    topK: agentConfig.topK || 5,
    topP: agentConfig.topP || 1,
    onError: (error) => console.error(error),
  });

  return response;
}

export function generateTextResponse({
  model,
  agentConfig,
  messages,
  agentId,
}: {
  model: LanguageModelV1;
  agentConfig: AgentWithKnowledgeBase;
  messages: CoreMessage[];
  agentId: string;
}) {
  if ("error" in agentConfig) {
    throw new Error(agentConfig.error);
  }

  const response = generateText({
    model,
    system: generateSysPrompt(agentConfig),
    messages,
    temperature: agentConfig.temperature || 0.7,
    tools: {
      retrieve_context: tool({
        description:
          "Retrieve context from knowledge base to answer question that you might not know",
        parameters: z.object({}),
        execute: async () => {
          const context = await searchSimilarChunks({
            query: messages[messages.length - 1].content as string,
            agentId,
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
          const context = await getAllKnowledgeChunks(agentId);
          return context;
        },
      }),
    },
    topK: agentConfig.topK || 5,
    topP: agentConfig.topP || 1,
  });

  return response;
}
