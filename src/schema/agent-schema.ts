import { z } from "zod";

export const agentFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "The name is too short"),
  description: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  systemPrompt: z.string().optional(),
  llmProvider: z.enum(["openai", "anthropic", "google"]),
  modelName: z.string().min(1).optional(),
  temperature: z.coerce.number().min(0).max(2),
  similarityThreshold: z.coerce.number().min(0).max(1),
  topK: z.coerce.number().min(1),
  topP: z.coerce.number().min(0.1).max(1),
});

export type AgentFormValues = z.infer<typeof agentFormSchema>;
