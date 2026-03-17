import { generateObject } from "ai";
import { z } from "zod/v4";

import { DEFAULT_EXTRACTION_PROMPT, getLLMProvider } from "../llm";
import { cleanText } from "../utils";

export async function parsePdfWithAgent(pdfBuffer: Buffer) {
  console.log("🤖 Parsing PDF with Agent");
  const pdfData = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;

  const model = getLLMProvider({
    name: "gemini-2.0-flash-001",
    provider: "google",
  });

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
            text: "Analyze the following PDF and generate a summary.",
          },
          {
            type: "file",
            data: pdfData,
            mediaType: "application/pdf",
          },
        ],
      },
    ],
  });

  if (!object) {
    throw new Error("Failed to parse PDF with agent");
  }

  return cleanText(object.content);
}
