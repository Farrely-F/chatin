import { generateObject } from "ai";
import { z } from "zod";

import { getLLMProvider } from "../llm";
import { cleanText } from "../utils";

export async function parsePdfWithAgent(pdfBuffer: Buffer) {
  console.log("🤖 Parsing PDF with Agent");
  const model = getLLMProvider({
    name: "gemini-2.0-flash-001",
    provider: "google",
  });

  const { object } = await generateObject({
    model,
    system: `
Decompose the 'Content' into clear and simple propositions, ensuring they are interpretable out of context.
1. Split compound sentences into simple sentences. Maintain the original phrasing from the input whenever possible.
2. For any named entity that is accompanied by additional descriptive information, separate this information into its own distinct proposition.
3. Decontextualize the proposition by adding necessary modifiers to nouns or entire sentences and replacing pronouns (e.g., 'it', 'he', 'she', 'they', 'this', 'that') with the full name of the entities they refer to.

    `,
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
            data: pdfBuffer,
            mimeType: "application/pdf",
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
