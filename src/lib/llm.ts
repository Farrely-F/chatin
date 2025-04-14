import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

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
