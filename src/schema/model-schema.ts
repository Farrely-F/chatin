import { z } from 'zod/v4';

export const modelSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(2, {
      message: "Name must be at least 2 characters.",
    })
    .max(100, {
      message: "Name must not exceed 100 characters.",
    }),
  provider: z
    .string()
    .min(2, {
      message: "Provider must be at least 2 characters.",
    })
    .max(100, {
      message: "Provider must not exceed 100 characters.",
    }),
  description: z.string().optional(),
  isAvailable: z.boolean(),
  supportsImageInput: z.boolean(),
  supportsToolUse: z.boolean(),
  supportsToolStreaming: z.boolean(),
  supportsObjectGeneration: z.boolean(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type ModelSchema = z.infer<typeof modelSchema>;
