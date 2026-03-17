import { generateObject } from "ai";
import { z } from "zod/v4";

import { DEFAULT_EXTRACTION_PROMPT, getLLMProvider } from "../llm";
import { cleanText } from "../utils";

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

  return cleanText(object.content);
}
