import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { convert as htmlToText } from "html-to-text";

type SemanticBoundary = {
  type: "table_row" | "list_item" | "sentence" | "paragraph" | "heading";
  start: number;
  end: number;
  content: string;
};

type SemanticChunkOptions = {
  chunkSize: number;
  type?: "text" | "html";
  chunkOverlap?: number;
  preserveTables?: boolean;
  preserveLists?: boolean;
  overlapSentences?: number;
};

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

function detectSemanticBoundaries(text: string): SemanticBoundary[] {
  const patterns: { pattern: RegExp; type: SemanticBoundary["type"] }[] = [
    { pattern: /\|[^\n]+\|/g, type: "table_row" },
    { pattern: /^[-*]\s+.+$|^1\.\s+.+$/gm, type: "list_item" },
    { pattern: /^#{1,4}\s+.+$/gm, type: "heading" },
    { pattern: /\n\n+/g, type: "paragraph" },
  ];

  const boundaries: SemanticBoundary[] = [];

  for (const { pattern, type } of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      boundaries.push({
        type,
        start: match.index,
        end: match.index + match[0].length,
        content: match[0],
      });
    }
  }

  return boundaries.sort((a, b) => a.start - b.start);
}

function createLangchainSplitter(chunkSize: number, overlapSize: number) {
  return new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap: overlapSize,
    separators: [
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
    ],
  });
}

async function fallbackChunking(
  text: string,
  chunkSize: number,
  overlapSize: number,
): Promise<string[]> {
  const splitter = createLangchainSplitter(chunkSize, overlapSize);
  const docs = await splitter.createDocuments([text]);
  return docs.map((d) => d.pageContent.trim());
}

function shouldStartNewChunk(
  currentLen: number,
  segLen: number,
  boundLen: number,
  chunkSize: number,
): boolean {
  return currentLen + segLen + boundLen > chunkSize;
}

function addChunkToResults(chunks: string[], chunk: string): void {
  if (chunk.length > 0) {
    chunks.push(chunk.trim());
  }
}

async function processBoundary(
  text: string,
  boundary: SemanticBoundary,
  currentPos: number,
  currentChunk: string,
  chunks: string[],
  chunkSize: number,
): Promise<{ currentChunk: string; newPos: number }> {
  const segment = text.substring(currentPos, boundary.start);
  const boundaryContent = text.substring(boundary.start, boundary.end);

  if (
    !shouldStartNewChunk(
      currentChunk.length,
      segment.length,
      boundaryContent.length,
      chunkSize,
    )
  ) {
    return {
      currentChunk: currentChunk + segment + boundaryContent,
      newPos: boundary.end,
    };
  }

  addChunkToResults(chunks, currentChunk);

  if (segment.length > chunkSize) {
    const subChunks = await semanticChunk(segment, chunkSize, 0, false, false);
    const lastChunk =
      subChunks.length > 0 ? subChunks[subChunks.length - 1] : "";
    return { currentChunk: lastChunk + boundaryContent, newPos: boundary.end };
  }

  return { currentChunk: segment + boundaryContent, newPos: boundary.end };
}

function handleRemainingText(
  text: string,
  currentPos: number,
  currentChunk: string,
  chunks: string[],
  chunkSize: number,
): string {
  const remaining = text.substring(currentPos);

  if (currentChunk.length + remaining.length <= chunkSize) {
    return currentChunk + remaining;
  }

  addChunkToResults(chunks, currentChunk);

  if (remaining.length <= chunkSize) {
    return remaining;
  }

  return "";
}

function applyOverlap(chunks: string[], overlapSize: number): string[] {
  if (overlapSize <= 0 || chunks.length <= 1) {
    return chunks;
  }

  const overlapped: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    overlapped.push(chunks[i]);

    if (i < chunks.length - 1) {
      const nextChunk = chunks[i + 1];
      const overlapText = nextChunk.substring(
        0,
        Math.min(overlapSize, nextChunk.length),
      );
      overlapped[i] = overlapped[i] + " " + overlapText;
    }
  }

  return overlapped;
}

async function semanticChunk(
  text: string,
  chunkSize: number,
  overlapSize: number,
  preserveTables: boolean,
  preserveLists: boolean,
): Promise<string[]> {
  if (text.length <= chunkSize) {
    return [text.trim()];
  }

  const boundaries = detectSemanticBoundaries(text);

  if (!preserveTables && !preserveLists) {
    return fallbackChunking(text, chunkSize, overlapSize);
  }

  const chunks: string[] = [];
  let currentPos = 0;
  let currentChunk = "";

  for (const boundary of boundaries) {
    const result = await processBoundary(
      text,
      boundary,
      currentPos,
      currentChunk,
      chunks,
      chunkSize,
    );
    currentChunk = result.currentChunk;
    currentPos = result.newPos;
  }

  const finalChunk = handleRemainingText(
    text,
    currentPos,
    currentChunk,
    chunks,
    chunkSize,
  );
  addChunkToResults(chunks, finalChunk);

  if (finalChunk === "" && currentPos < text.length) {
    const remaining = text.substring(currentPos);
    const subChunks = await semanticChunk(
      remaining,
      chunkSize,
      overlapSize,
      preserveTables,
      preserveLists,
    );
    chunks.push(...subChunks);
  }

  return applyOverlap(chunks, overlapSize);
}

export async function splitIntoChunksSemantic(
  content: string,
  options: SemanticChunkOptions,
): Promise<string[]> {
  const {
    chunkSize = 500,
    chunkOverlap = Math.floor(chunkSize * 0.2),
    type = "text",
    preserveTables = true,
    preserveLists = true,
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
  const chunks = await semanticChunk(
    text,
    chunkSize,
    chunkOverlap,
    preserveTables,
    preserveLists,
  );

  return chunks.filter((c) => c.length > 0);
}

export async function splitIntoChunks(
  content: string,
  options: {
    chunkSize: number;
    type?: "text" | "html";
    chunkOverlap?: number;
    separators?: string[];
  },
) {
  return splitIntoChunksSemantic(content, {
    chunkSize: options.chunkSize,
    type: options.type,
    chunkOverlap: options.chunkOverlap,
    preserveTables: true,
    preserveLists: true,
  });
}

export type { SemanticChunkOptions, SemanticBoundary };
