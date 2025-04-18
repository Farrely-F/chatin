export function splitIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  let currentChunk = "";

  // Split by paragraphs first
  const paragraphs = text.split(/\n\s*\n/);

  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed chunk size, save current chunk and start new one
    if (
      currentChunk.length + paragraph.length > chunkSize &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk.trim());
      currentChunk = "";
    }

    currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
  }

  // Add the last chunk if it's not empty
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
