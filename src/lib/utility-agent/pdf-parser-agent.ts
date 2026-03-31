import { logAgentUsage } from "@/service/agent-usage";
import { generateObject } from "ai";
import { z } from "zod/v4";

import { sanitizeContent } from "../content-sanitizer";
import { DEFAULT_EXTRACTION_PROMPT, getLLMProvider } from "../llm";

const AGENTIC_CONTEXT_LIMIT_PATTERN =
  /maximum context length|context window|requested about|reduce the length|context-compression plugin/i;
const AGENTIC_INVALID_JSON_RESPONSE_PATTERN =
  /Unexpected token '<'|is not a valid JSON|not a valid JSON|not valid JSON/i;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const cause = (error as { cause?: unknown }).cause;
    const causeMessage = cause ? getErrorMessage(cause) : "";
    return `${error.message} ${causeMessage}`.trim();
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && error !== null) {
    const possibleMessage = (error as { message?: unknown }).message;
    if (typeof possibleMessage === "string") {
      return possibleMessage;
    }
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "";
  }
}

export class AgenticParseContextLimitError extends Error {
  constructor() {
    super(
      "Agentic parse exceeded the model context limit. Try PDF parse mode, a smaller PDF, or a higher-context model.",
    );
    this.name = "AgenticParseContextLimitError";
  }
}

export class AgenticParseInvalidProviderResponseError extends Error {
  constructor() {
    super(
      "Agentic parse failed because the provider returned an invalid response. Try again, switch model/provider, or use PDF parse mode.",
    );
    this.name = "AgenticParseInvalidProviderResponseError";
  }
}

export function isAgenticParseContextLimitError(error: unknown): boolean {
  if (error instanceof AgenticParseContextLimitError) {
    return true;
  }

  return AGENTIC_CONTEXT_LIMIT_PATTERN.test(getErrorMessage(error));
}

export function isAgenticParseInvalidProviderResponseError(
  error: unknown,
): boolean {
  if (error instanceof AgenticParseInvalidProviderResponseError) {
    return true;
  }

  return AGENTIC_INVALID_JSON_RESPONSE_PATTERN.test(getErrorMessage(error));
}

type AgenticParseModel = {
  id: string;
  name: string;
  provider: string;
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

export async function parsePdfWithAgent(
  pdfBuffer: Buffer,
  parseModel: AgenticParseModel,
  context: {
    agentId: string;
    requestUserId?: string;
  },
) {
  console.log("🤖 Parsing PDF with Agent");

  const model = getLLMProvider(parseModel);

  try {
    const result = await generateObject({
      model,
      system: DEFAULT_EXTRACTION_PROMPT,
      schema: z.object({
        content: z.string(),
      }),
      messages: [
        {
          role: "user",

          content: [
            {
              type: "text",
              text: "Extract ALL content from every page of this PDF into structured markdown. Do not skip any tables, pricing grids, or data.",
            },
            {
              type: "file",
              data: pdfBuffer,
              mediaType: "application/pdf",
            },
          ],
        },
      ],
    });

    const usage =
      (
        result as {
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
        result as {
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

    const providerMetadata =
      (
        result as {
          providerMetadata?: unknown;
        }
      ).providerMetadata ??
      (
        result as {
          response?: {
            providerMetadata?: unknown;
          };
        }
      ).response?.providerMetadata;

    const providerUsage = getProviderUsage(
      parseModel.provider,
      providerMetadata,
    );

    await logAgentUsage({
      agentId: context.agentId,
      modelId: parseModel.id,
      provider: parseModel.provider,
      requestUserId: context.requestUserId,
      source: "tool",
      inputTokens: providerUsage?.promptTokens ?? usage?.inputTokens ?? 0,
      outputTokens: providerUsage?.completionTokens ?? usage?.outputTokens ?? 0,
      cachedInputTokens:
        providerUsage?.promptTokensDetails?.cachedTokens ??
        usage?.cachedInputTokens ??
        0,
      totalTokens: providerUsage?.totalTokens ?? usage?.totalTokens,
      billedCostUsd: getBilledCostUsd(providerUsage),
    });

    if (!result.object) {
      throw new Error("Failed to parse PDF with agent");
    }

    const extractedContent = result.object.content.trim();
    const sanitized = sanitizeContent(extractedContent);

    if (sanitized.hadToSanitize) {
      console.warn("PDF parse content was sanitized:", sanitized.warnings);
    }

    return sanitized.content;
  } catch (error) {
    if (isAgenticParseContextLimitError(error)) {
      throw new AgenticParseContextLimitError();
    }

    if (isAgenticParseInvalidProviderResponseError(error)) {
      throw new AgenticParseInvalidProviderResponseError();
    }

    throw error;
  }
}
