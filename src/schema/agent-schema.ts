import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const agentFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "The name is too short"),
  slug: z
    .string()
    .min(2, "The slug is too short")
    .regex(slugRegex, {
      message:
        "Slug must be lowercase, alphanumeric, and may include hyphens (no emoji, symbols, or spaces)",
    })
    .optional(),
  description: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  systemPrompt: z.string().optional(),
  modelId: z.string().min(1, "Model is required"),
  temperature: z.coerce.number().min(0).max(2),
  similarityThreshold: z.coerce.number().min(0).max(1).optional(),
  topK: z.coerce.number().min(1).optional(),
  topP: z.coerce.number().min(0.1).max(1).optional(),
  personaId: z.string().optional(),
});

export type AgentFormValues = z.infer<typeof agentFormSchema>;
