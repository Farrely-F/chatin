import { AgentWithKnowledgeBase } from "@/service/agents";
import { ModelDetails } from "@/service/model";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  type LanguageModel,
  Tool,
  type UIMessage,
  convertToModelMessages,
  generateText,
  stepCountIs,
  streamText,
  tool,
} from "ai";
import { z } from "zod/v4";

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

export function getLLMProvider(
  model: Pick<ModelDetails, "name" | "provider"> | null,
) {
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
**Role**
You are an AI chatbot who helps users with their inquiries, issues and requests. You aim to provide excellent, friendly and efficient replies at all times. Your role is to listen attentively to the user, understand their needs, and do your best to assist them or direct them to the appropriate resources.

${
  knowledgeBases.length > 0 &&
  `
🔍 **Knowledge Base Handling**
- Always check the relevant knowledge base *before* answering any question.
- Do not share any information about the knowledge base with the user.
- No Data Divulge: Never mention that you have access to training data explicitly to the user.
`
}

🤖 **Agent Info**
- Agent Name: ${name}

🧠 **Persona Settings**
${
  personas
    ? `- Sex: ${personas.sex}
- Answer Preference: ${personas.answerPreference}
- Formality: ${personas.formality}
- Emoji Usage: ${personas.emojiUsage}
- Default Language: ${personas.defaultLanguage}`
    : "- No Persona Attached"
}

📚 **Knowledge Bases**
${
  knowledgeBases.length > 0
    ? knowledgeBases
        .map(
          (kb, index) =>
            `- ${index + 1}. Name: ${kb.fileName} (Use ID internally: ${kb.id})`,
        )
        .join("\n")
    : "- No Knowledge Bases Attached"
}

📝 **Additional Instructions**
${systemPrompt}
  `.trim();
}

export function generateStreamResponse({
  model,
  agentConfig,
  messages,
  agentId,
}: {
  model: LanguageModel;
  agentConfig: AgentWithKnowledgeBase;
  messages: UIMessage[];
  agentId: string;
}) {
  if ("error" in agentConfig) {
    throw new Error(agentConfig.error);
  }

  const response = streamText({
    maxRetries: 0,
    stopWhen: stepCountIs(5),
    model,
    system: generateSysPrompt(agentConfig),
    messages: convertToModelMessages(messages),
    temperature: agentConfig.temperature || 0.7,

    tools: agentConfig.model.supportsToolUse
      ? llmToolsConfig({ agentId, agentConfig })
      : undefined,

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
  model: LanguageModel;
  agentConfig: AgentWithKnowledgeBase;
  messages: UIMessage[];
  agentId: string;
}) {
  if ("error" in agentConfig) {
    throw new Error(agentConfig.error);
  }

  const response = generateText({
    maxRetries: 0,
    stopWhen: stepCountIs(5),
    model,
    system: generateSysPrompt(agentConfig),
    messages: convertToModelMessages(messages),
    temperature: agentConfig.temperature || 0.7,

    tools: agentConfig.model.supportsToolUse
      ? llmToolsConfig({ agentId, agentConfig })
      : undefined,

    topP: agentConfig.topP || 1,
  });

  return response;
}

function llmToolsConfig({
  agentId,
  agentConfig,
}: {
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
      inputSchema: z.object({
        userQuestion: z.string().describe("The user's question"),
      }),
      execute: async ({ userQuestion }) => {
        console.log("Calling Retrieve Context");
        const context = await searchSimilarChunks({
          query: userQuestion,
          agentId,
          topK: agentConfig.topK || 5,
          similarityThreshold: agentConfig.similarityThreshold || 0.5,
        });
        return context;
      },
    }),
  } satisfies Record<string, Tool>;

  return tools;
}

export const DEFAULT_EXTRACTION_PROMPT = `
You are an expert document analyst. This image is a slide from a business presentation.
 
Extract ALL content from this slide into clean, structured markdown. Be thorough and precise:
 
- Preserve all text exactly as written (titles, subtitles, body text, labels)
- Convert tables into markdown table format (| col | col |)
- Represent bullet lists as markdown lists
- For charts or graphs: describe the data and extract all visible numbers/labels
- For pricing or data grids: extract as markdown tables with all values
- Note any logos, icons, or visual elements briefly (e.g., "[Company Logo: XYZ]")
- Do NOT add commentary, introductions, or summaries — only extracted content
 
Output ONLY the structured markdown, nothing else.
`.trim();
