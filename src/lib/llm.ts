import { logAgentUsage } from "@/service/agent-usage";
import { AgentWithKnowledgeBase } from "@/service/agents";
import { ModelDetails } from "@/service/model";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  type JSONValue,
  type LanguageModel,
  type ModelMessage,
  Tool,
  type UIMessage,
  convertToModelMessages,
  generateText,
  stepCountIs,
  streamText,
  tool,
} from "ai";
import { z } from "zod/v4";

import { sanitizeContent } from "./content-sanitizer";
import { searchSimilarChunksHybrid } from "./similarity-search";

export type FeedbackGuidance = {
  userQuestion: string;
  expectedResponse: string;
  feedbackNote: string | null;
  strict?: boolean; // Future use to enforce strict matching of expected response
};

type OpenRouterPromptCacheControl = {
  type: "ephemeral";
  ttl?: "1h";
};

type LlmProviderOptions = {
  openrouter?: Record<string, JSONValue>;
};

type ProviderUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  promptTokensDetails?: {
    cachedTokens?: number;
  };
  cost?: number;
  costDetails?: {
    upstreamInferenceCost?: number;
  };
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

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY!,
});

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
  headers: {
    "HTTP-Referer": "https://chatto.co.id",
    "X-Title": "Chatto",
  },
});

function getOpenRouterPromptCacheControl(
  model: Pick<ModelDetails, "name" | "provider"> | null,
): OpenRouterPromptCacheControl | undefined {
  if (model?.provider !== "openrouter") {
    return undefined;
  }

  // Anthropic models require explicit cache control for automatic prompt caching.
  if (!model.name.startsWith("anthropic/")) {
    return undefined;
  }

  if (process.env.OPENROUTER_PROMPT_CACHE_TTL === "1h") {
    return { type: "ephemeral", ttl: "1h" };
  }

  return { type: "ephemeral" };
}

function buildLlmProviderOptions({
  model,
  requestUserId,
}: {
  model: Pick<ModelDetails, "name" | "provider"> | null;
  requestUserId?: string;
}): LlmProviderOptions | undefined {
  if (model?.provider !== "openrouter") {
    return undefined;
  }

  const openrouterOptions: Record<string, JSONValue> = {
    usage: {
      include: true,
    },
  };

  const cacheControl = getOpenRouterPromptCacheControl(model);
  if (cacheControl) {
    openrouterOptions.cache_control = cacheControl;
  }

  const normalizedUserId = requestUserId?.trim();
  if (normalizedUserId) {
    openrouterOptions.user = normalizedUserId;
  }

  return {
    openrouter: openrouterOptions,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getProviderUsage(
  provider: string,
  providerMetadata: unknown,
): ProviderUsage | undefined {
  if (!isRecord(providerMetadata)) {
    return undefined;
  }

  const providerEntry = providerMetadata[provider];
  if (!isRecord(providerEntry)) {
    return undefined;
  }

  const usage = providerEntry.usage;
  if (!isRecord(usage)) {
    return undefined;
  }

  return usage as ProviderUsage;
}

function getBilledCostUsd(providerUsage: ProviderUsage | undefined) {
  const cost =
    providerUsage?.costDetails?.upstreamInferenceCost ?? providerUsage?.cost;

  if (!Number.isFinite(cost) || (cost ?? 0) < 0) {
    return undefined;
  }

  return cost;
}

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

type MessagePartLike = {
  type?: string;
  text?: string;
};

function normalizeQuestion(text: string) {
  return text
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s]/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function extractTextFromMessage(message: UIMessage) {
  const parts = (message as { parts?: MessagePartLike[] }).parts;

  if (!Array.isArray(parts)) {
    return "";
  }

  return parts
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text?.trim() || "")
    .filter((text) => text.length > 0)
    .join("\n\n");
}

function getLatestUserQuestion(messages: UIMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message.role !== "user") {
      continue;
    }

    const text = extractTextFromMessage(message);
    if (text) {
      return text;
    }
  }

  return "";
}

function prioritizeFeedbackGuidance(
  feedbackGuidance: FeedbackGuidance[],
  currentUserQuestion: string,
) {
  if (feedbackGuidance.length === 0) {
    return {
      prioritizedGuidance: [] as FeedbackGuidance[],
      exactMatches: [] as FeedbackGuidance[],
    };
  }

  const normalizedCurrent = normalizeQuestion(currentUserQuestion);

  const exactMatches = feedbackGuidance.filter(
    (feedback) =>
      normalizedCurrent.length > 0 &&
      normalizeQuestion(feedback.userQuestion) === normalizedCurrent,
  );

  const relatedMatches = feedbackGuidance.filter((feedback) => {
    const normalizedFeedbackQuestion = normalizeQuestion(feedback.userQuestion);

    if (!normalizedCurrent || !normalizedFeedbackQuestion) {
      return false;
    }

    return (
      normalizedFeedbackQuestion.includes(normalizedCurrent) ||
      normalizedCurrent.includes(normalizedFeedbackQuestion)
    );
  });

  const exactMatchIds = new Set(
    exactMatches.map(
      (f) =>
        `${f.userQuestion}|${f.expectedResponse}|${f.feedbackNote ?? "null"}`,
    ),
  );

  const prioritizedGuidance = [
    ...exactMatches,
    ...relatedMatches,
    ...feedbackGuidance,
  ]
    .filter((feedback, index, list) => {
      const id = `${feedback.userQuestion}|${feedback.expectedResponse}|${feedback.feedbackNote ?? "null"}`;
      const firstIndex = list.findIndex(
        (c) =>
          `${c.userQuestion}|${c.expectedResponse}|${c.feedbackNote ?? "null"}` ===
          id,
      );
      return firstIndex === index;
    })
    .filter(
      (feedback) =>
        !exactMatchIds.has(
          `${feedback.userQuestion}|${feedback.expectedResponse}|${feedback.feedbackNote ?? "null"}`,
        ),
    );

  return { prioritizedGuidance, exactMatches };
}

function generateSysPrompt(
  agentConfig: AgentWithKnowledgeBase,
  feedbackGuidance: FeedbackGuidance[] = [],
  currentUserQuestion = "",
) {
  if ("error" in agentConfig) {
    throw new Error(agentConfig.error);
  }

  const { name, systemPrompt, personas, knowledgeBases } = agentConfig;

  const { prioritizedGuidance, exactMatches } = prioritizeFeedbackGuidance(
    feedbackGuidance,
    currentUserQuestion,
  );

  const feedbackSection = [
    ...exactMatches.map((f) => ({ ...f, isExact: true })),
    ...prioritizedGuidance.map((f) => ({ ...f, isExact: false })),
  ];

  const feedbackGuidancePrompt =
    feedbackSection.length > 0
      ? `
🎯 **User Feedback Guidance**
- The following are examples from previous user interactions.
- Use these to understand user preferences and communication style.
- Apply suggested approaches naturally when relevant.

${feedbackSection
  .map((feedback, index) => {
    const label = feedback.isExact
      ? "Exact Match (User Corrected)"
      : "Related Example";
    return `${index + 1}. [${label}] User Question: ${feedback.userQuestion}
   Suggested Response: ${feedback.expectedResponse}${
     feedback.feedbackNote
       ? `
   Note: ${feedback.feedbackNote}`
       : ""
   }`;
  })
  .join("\n\n")}
`
      : "";

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

${feedbackGuidancePrompt}
  `.trim();
}

function toSafeModelMessages(messages: UIMessage[]): ModelMessage[] {
  return convertToModelMessages(messages, { ignoreIncompleteToolCalls: true });
}

export function generateStreamResponse({
  model,
  agentConfig,
  messages,
  agentId,
  feedbackGuidance = [],
  requestUserId,
}: {
  model: LanguageModel;
  agentConfig: AgentWithKnowledgeBase;
  messages: UIMessage[];
  agentId: string;
  feedbackGuidance?: FeedbackGuidance[];
  requestUserId?: string;
}) {
  if ("error" in agentConfig) {
    throw new Error(agentConfig.error);
  }

  const shouldUseRetrievalTools =
    agentConfig.model.supportsToolUse && agentConfig.knowledgeBases.length > 0;

  const providerOptions = buildLlmProviderOptions({
    model: agentConfig.model,
    requestUserId,
  });

  const response = streamText({
    maxRetries: 0,
    stopWhen: stepCountIs(5),
    model,
    system: generateSysPrompt(
      agentConfig,
      feedbackGuidance,
      getLatestUserQuestion(messages),
    ),
    messages: toSafeModelMessages(messages),
    temperature: agentConfig.temperature || 0.7,

    tools: shouldUseRetrievalTools
      ? llmToolsConfig({ agentId, agentConfig })
      : undefined,
    toolChoice: shouldUseRetrievalTools ? "auto" : undefined,
    providerOptions,

    topP: agentConfig.topP || 1,
    onError: (error) => console.error(error),
    onFinish: async ({ usage, providerMetadata }) => {
      const providerUsage = getProviderUsage(
        agentConfig.model.provider,
        providerMetadata,
      );
      const inputTokens = providerUsage?.promptTokens ?? usage.inputTokens ?? 0;
      const outputTokens =
        providerUsage?.completionTokens ?? usage.outputTokens ?? 0;
      const cachedInputTokens =
        providerUsage?.promptTokensDetails?.cachedTokens ??
        usage.cachedInputTokens ??
        0;
      const totalTokens =
        providerUsage?.totalTokens ??
        usage.totalTokens ??
        inputTokens + outputTokens;

      await logAgentUsage({
        agentId,
        modelId: agentConfig.model.id,
        provider: agentConfig.model.provider,
        requestUserId,
        source: "stream",
        inputTokens,
        outputTokens,
        cachedInputTokens,
        totalTokens,
        billedCostUsd: getBilledCostUsd(providerUsage),
      });
    },
  });

  return response;
}

export async function generateTextResponse({
  model,
  agentConfig,
  messages,
  agentId,
  feedbackGuidance = [],
  requestUserId,
}: {
  model: LanguageModel;
  agentConfig: AgentWithKnowledgeBase;
  messages: UIMessage[];
  agentId: string;
  feedbackGuidance?: FeedbackGuidance[];
  requestUserId?: string;
}) {
  if ("error" in agentConfig) {
    throw new Error(agentConfig.error);
  }

  const shouldUseRetrievalTools =
    agentConfig.model.supportsToolUse && agentConfig.knowledgeBases.length > 0;

  const providerOptions = buildLlmProviderOptions({
    model: agentConfig.model,
    requestUserId,
  });

  const response = await generateText({
    maxRetries: 0,
    stopWhen: stepCountIs(5),
    model,
    system: generateSysPrompt(
      agentConfig,
      feedbackGuidance,
      getLatestUserQuestion(messages),
    ),
    messages: toSafeModelMessages(messages),
    temperature: agentConfig.temperature || 0.7,

    tools: shouldUseRetrievalTools
      ? llmToolsConfig({ agentId, agentConfig })
      : undefined,
    toolChoice: shouldUseRetrievalTools ? "auto" : undefined,
    providerOptions,

    topP: agentConfig.topP || 1,
  });

  const usage =
    (
      response as {
        usage?: {
          inputTokens?: number;
          outputTokens?: number;
          totalTokens?: number;
          cachedInputTokens?: number;
        };
        response?: {
          usage?: {
            inputTokens?: number;
            outputTokens?: number;
            totalTokens?: number;
            cachedInputTokens?: number;
          };
        };
      }
    ).usage ??
    (
      response as {
        response?: {
          usage?: {
            inputTokens?: number;
            outputTokens?: number;
            totalTokens?: number;
            cachedInputTokens?: number;
          };
        };
      }
    ).response?.usage;

  const responseProviderMetadata =
    (
      response as {
        providerMetadata?: unknown;
      }
    ).providerMetadata ??
    (
      response as {
        response?: {
          providerMetadata?: unknown;
        };
      }
    ).response?.providerMetadata;

  const providerUsage = getProviderUsage(
    agentConfig.model.provider,
    responseProviderMetadata,
  );

  await logAgentUsage({
    agentId,
    modelId: agentConfig.model.id,
    provider: agentConfig.model.provider,
    requestUserId,
    source: "text",
    inputTokens: providerUsage?.promptTokens ?? usage?.inputTokens ?? 0,
    outputTokens: providerUsage?.completionTokens ?? usage?.outputTokens ?? 0,
    cachedInputTokens:
      providerUsage?.promptTokensDetails?.cachedTokens ??
      usage?.cachedInputTokens ??
      0,
    totalTokens: providerUsage?.totalTokens ?? usage?.totalTokens,
    billedCostUsd: getBilledCostUsd(providerUsage),
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
        const normalizedTopK = Math.max(1, Math.floor(agentConfig.topK ?? 5));
        const normalizedSimilarityThreshold = Math.min(
          1,
          Math.max(0, agentConfig.similarityThreshold ?? 0.5),
        );

        const results = await searchSimilarChunksHybrid({
          query: userQuestion,
          agentId,
          topK: normalizedTopK,
          similarityThreshold: normalizedSimilarityThreshold,
          enableHybrid: true,
          vectorWeight: 0.6,
          bm25Weight: 0.4,
          enableQueryExpansion: true,
          queryExpansionWeight: 0.3,
          enableReranking: true,
          rerankWeight: 0.4,
        });

        const sanitizedResults = results.map((r) => {
          const sanitized = sanitizeContent(r.content);
          return {
            id: r.id,
            content: sanitized.content,
            similarity: r.rerankScore ?? r.hybridScore ?? r.similarity,
            hybridScore: r.hybridScore,
            bm25Score: r.bm25Score,
            rerankScore: r.rerankScore,
            expansionTerms: r.expansion?.addedTerms,
            usedQueryExpansion: r.usedQueryExpansion,
            usedReranking: r.usedReranking,
            contentSanitized: sanitized.hadToSanitize,
            sanitizationWarnings: sanitized.warnings,
          };
        });

        return sanitizedResults;
      },
    }),
  } satisfies Record<string, Tool>;

  return tools;
}

export const DEFAULT_EXTRACTION_PROMPT = `
You are an expert document analyst. You will receive a PDF document containing business presentation slides.

Extract ALL content from EVERY page/slide into clean, structured markdown. Be thorough and precise:

- Preserve all text exactly as written (titles, subtitles, body text, labels)
- Convert ALL tables into markdown table format (| col | col |)
- Represent bullet lists as markdown lists
- For charts or graphs: describe the data and extract all visible numbers/labels
- For pricing or data grids: extract as markdown tables with ALL values — do not skip any rows
- Note any logos, icons, or visual elements briefly (e.g., "[Company Logo: XYZ]")
- Do NOT summarize, skip, or omit any slide or section
- Do NOT add commentary, introductions, or summaries — only extracted content

Output ONLY the structured markdown, nothing else.
`.trim();
