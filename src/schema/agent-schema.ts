import { z } from "zod";

export const agentFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  description: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  systemPrompt: z.string().optional(),
  llmProvider: z.enum(["openai", "claude", "gemini"]),
  modelName: z.string().min(1).optional(),
  temperature: z.coerce.number().min(0).max(1),
});

export type AgentFormValues = z.infer<typeof agentFormSchema>;
