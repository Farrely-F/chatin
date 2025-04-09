import { encode } from "gpt-3-encoder";

export function chunkText(text: string, maxTokens: number): string[] {
  const sentences = text.split(/(?<=[.?!])\s+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    const tokenLength = encode(currentChunk + sentence).length;

    if (tokenLength > maxTokens) {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = sentence;
    } else {
      currentChunk += " " + sentence;
    }
  }

  if (currentChunk) chunks.push(currentChunk);

  return chunks.map((chunk) => chunk.trim());
}
