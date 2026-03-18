import { generateObject } from "ai";
import { z } from "zod/v4";

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
  name: string;
  provider: string;
};

export async function parsePdfWithAgent(
  pdfBuffer: Buffer,
  parseModel: AgenticParseModel,
) {
  console.log("🤖 Parsing PDF with Agent");

  const model = getLLMProvider(parseModel);

  try {
    const { object } = await generateObject({
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

    if (!object) {
      throw new Error("Failed to parse PDF with agent");
    }

    return object.content.trim();
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
