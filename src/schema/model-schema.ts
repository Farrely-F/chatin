import { z } from "zod/v4";

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
  modelType: z.enum(["language", "embedding"]),
  description: z.string().optional(),
  isAvailable: z.boolean(),
  supportsImageInput: z.boolean(),
  supportsCustomDimensions: z.boolean(),
  supportsMultimodal: z.boolean(),
  supportsToolUse: z.boolean(),
  supportsToolStreaming: z.boolean(),
  supportsObjectGeneration: z.boolean(),
  inputCostPer1mTokens: z.coerce
    .number()
    .min(0, { message: "Input cost must be greater than or equal to 0." }),
  outputCostPer1mTokens: z.coerce
    .number()
    .min(0, { message: "Output cost must be greater than or equal to 0." }),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type ModelSchema = z.infer<typeof modelSchema>;
export type ModelSchemaInput = z.input<typeof modelSchema>;
