import { AgentWithKnowledgeBase } from "@/service/agents";
import { getAllKnowledgeChunks } from "@/service/knowledgebases";
import { ModelDetails } from "@/service/model";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  CoreMessage,
  LanguageModelV1,
  Tool,
  generateText,
  streamText,
  tool,
} from "ai";
import { z } from "zod";

import { searchSimilarChunks } from "./similarity-search";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY!,
});

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export function getLLMProvider(model: ModelDetails | null) {
  if (!model) {
    throw new Error("Model not found");
  }

  switch (model.provider) {
    case "openai":
      return openai(model.name);
    case "google":
      return google(model.name);
    case "anthropic":
      return anthropic(model.name);
    case "groq":
      return groq(model.name);
    case "openrouter":
      return openrouter(model.name);
    default:
      throw new Error(`Unknown LLM provider: ${model.provider}`);
  }
}

function generateSysPrompt(agentConfig: AgentWithKnowledgeBase) {
  if ("error" in agentConfig) {
    throw new Error(agentConfig.error);
  }

  const { name, systemPrompt, personas, knowledgeBases } = agentConfig;

  return `
  You are ${name}
  Always Check your knowledge base before answering any questions. Only respond to questions using information from tool calls.
  if you have more than one knowledgebase, always ask the user on which knowledge base they want to use before using the tool.
  Ask the user to choose the knowledgebase name and then proceed to use the id (do not share the id directly with the user).
  if there is only one knowledgebase, proceed to use the knowledgebase directly.
  
  System Information:
  - Agent Name: ${name}

  Persona:
  ${
    personas
      ? `
    - Sex: ${personas?.sex}
    - Answer Preference: ${personas?.answerPreference}
    - Formality: ${personas?.formality}
    - Emoji Usage: ${personas?.emojiUsage}
    - Default Language: ${personas?.defaultLanguage}
    `
      : "No Persona Attached"
  } 

  Knowledgebases: 
  ${
    knowledgeBases.length > 0
      ? knowledgeBases.map((kb) => {
          return `
      - name: ${kb.fileName}
      - id: ${kb.id} (do not share the id directly with the user)
      `;
        })
      : "No Knowledgebases Attached (ask user to upload a knowledgebase at the training data page)"
  }

  Additional Instructions:
  ${systemPrompt}
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
    tools: llmToolsConfig({ messages, agentId, agentConfig }),
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
    tools: llmToolsConfig({ messages, agentId, agentConfig }),
    topK: agentConfig.topK || 5,
    topP: agentConfig.topP || 1,
  });

  return response;
}

function llmToolsConfig({
  messages,
  agentId,
  agentConfig,
}: {
  messages: CoreMessage[];
  agentId: string;
  agentConfig: AgentWithKnowledgeBase;
}) {
  if ("error" in agentConfig) {
    throw new Error(agentConfig.error);
  }

  const tools = {
    retrieve_context: tool({
      description:
        "Retrieve context from knowledge base to answer question that you might not know",
      parameters: z.object({
        knowledgeBaseId: z
          .string()
          .describe(
            "The knowledge base id of the user selected knowledge base from your system prompt",
          ),
      }),
      execute: async ({ knowledgeBaseId }) => {
        console.log("Calling Retrieve Context");
        const context = await searchSimilarChunks({
          query: messages[messages.length - 1].content as string,
          agentId,
          knowledgeBaseId,
          topK: agentConfig.topK || 5,
          similarityThreshold: agentConfig.similarityThreshold || 0.5,
        });
        return context;
      },
    }),
    retrieve_whole_knowledge_base: tool({
      description:
        "Retrieve the whole knowledge base chunks, use this to answer questions that need whole knowledge base context, such as summarization",
      parameters: z.object({
        knowledgeBaseId: z
          .string()
          .describe(
            "The knowledge base id of the user selected knowledge base from your system prompt",
          ),
      }),
      execute: async ({ knowledgeBaseId }) => {
        console.log("Calling Whole Context");
        const context = await getAllKnowledgeChunks(agentId, knowledgeBaseId);
        return context;
      },
    }),
  } satisfies Record<string, Tool>;

  return tools;
}
