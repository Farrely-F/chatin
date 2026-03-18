import { UIMessage } from "ai";
import { z } from "zod/v4";

export const invalidPublicChatBodyMessage =
  "Invalid messages format. Expected UIMessage parts format: messages[].parts[].";

const publicChatMessageSchema = z.looseObject({
  id: z.string().min(1),
  role: z.string(),
  parts: z
    .array(
      z.looseObject({
        type: z.string(),
      }),
    )
    .min(1),
});

export const publicChatBodySchema = z.object({
  messages: z.array(publicChatMessageSchema).min(1),
  user_id: z.string().optional(),
});

export type PublicChatBody = {
  messages: UIMessage[];
  user_id?: string;
};

type ParsePublicChatBodyResult =
  | {
      success: true;
      data: PublicChatBody;
    }
  | {
      success: false;
    };

export function parsePublicChatBody(input: unknown): ParsePublicChatBodyResult {
  const parsed = publicChatBodySchema.safeParse(input);

  if (!parsed.success) {
    return { success: false };
  }

  return {
    success: true,
    data: parsed.data as unknown as PublicChatBody,
  };
}
