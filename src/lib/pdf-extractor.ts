import pdfParse from "pdf-parse";

import { sanitizeContent } from "./content-sanitizer";

export const extractTextFromPdf = async (buffer: Buffer): Promise<string> => {
  console.log("💭 Extracting text from PDF");

  const data = await pdfParse(buffer);
  const rawText = data.text;

  const sanitized = sanitizeContent(rawText);

  if (sanitized.hadToSanitize) {
    console.warn("PDF extract content was sanitized:", sanitized.warnings);
  }

  return sanitized.content;
};
