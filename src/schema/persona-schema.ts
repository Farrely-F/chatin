import { z } from "zod";

export const createPersonaSchema = z.object({
  name: z.string().trim().min(1, "Name is too short"),
  description: z.string().optional(),
  sex: z.enum(["male", "female", "neutral"]),
  answerPreference: z.enum(["short", "moderate", "long"]),
  formality: z.enum(["friendly", "neutral", "formal"]),
  emojiUsage: z.enum(["never", "normal", "frequent"]),
  defaultLanguage: z.enum(["english", "indonesia"]),
});

export type CreatePersonaSchema = z.infer<typeof createPersonaSchema>;
