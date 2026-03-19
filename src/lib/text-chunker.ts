import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { convert as htmlToText } from "html-to-text";

type Options = {
  chunkSize: number;
  type?: "text" | "html";
  chunkOverlap?: number;
  separators?: string[];
};

const DEFAULT_SEPARATORS = [
  "\n## ",
  "\n### ",
  "\n#### ",
  "\n|",
  "\n- ",
  "\n* ",
  "\n\n",
  "\n",
  ". ",
  " ",
  "",
];

function normalizeForChunking(text: string) {
  return text
    .normalize("NFKC")
    .replaceAll(/\r\n?/g, "\n")
    .replaceAll(/\t+/g, " ")
    .replaceAll(/([A-Za-z])-\n([A-Za-z])/g, "$1$2")
    .replaceAll(/[ \f\v]+$/gm, "")
    .replaceAll(/\n{3,}/g, "\n\n")
    .replaceAll(/\.{2,}/g, ".")
    .replaceAll(/\s+([.,;:!?])/g, "$1")
    .replaceAll(/\s+\./g, ".")
    .trim();
}

export async function splitIntoChunks(content: string, options: Options) {
  const {
    chunkSize = 500,
    chunkOverlap = Math.floor(chunkSize * 0.2),
    type = "text",
    separators = DEFAULT_SEPARATORS,
  } = options;

  const rawText =
    type === "html"
      ? htmlToText(content, {
          wordwrap: false,
          selectors: [
            { selector: "h1", format: "heading", options: { level: 1 } },
            { selector: "h2", format: "heading", options: { level: 2 } },
            { selector: "table", format: "dataTable" },
            { selector: "a", options: { ignoreHref: true } },
            { selector: "img", format: "skip" },
          ],
        })
      : content;

  const text = normalizeForChunking(rawText);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators,
  });

  const chunks = await splitter.createDocuments([text]);

  return chunks.map((chunk) => chunk.pageContent);
}
