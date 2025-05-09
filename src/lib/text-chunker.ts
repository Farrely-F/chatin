import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { convert as htmlToText } from "html-to-text";

import { cleanText } from "./utils";

type Options = {
  chunkSize: number;
  type?: "text" | "html";
  chunkOverlap?: number;
  separators?: string[];
};

export async function splitIntoChunks(content: string, options: Options) {
  const {
    chunkSize = 500,
    chunkOverlap = Math.floor(chunkSize * 0.2),
    type = "text",
    separators = undefined,
  } = options;

  const rawText = type === "html" ? htmlToText(content) : content;
  const text = cleanText(rawText);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators,
  });

  const chunks = await splitter.createDocuments([text]);

  return chunks.map((chunk) => chunk.pageContent);
}
