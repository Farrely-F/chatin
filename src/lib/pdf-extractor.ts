import pdfParse from "pdf-parse";

export const extractTextFromPdf = async (buffer: Buffer): Promise<string> => {
  const data = await pdfParse(buffer);
  return data.text;
};
