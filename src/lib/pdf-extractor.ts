import pdfParse from "pdf-parse";

export const extractTextFromPdf = async (buffer: Buffer): Promise<string> => {
  console.log("💭 Extracting text from PDF");

  const data = await pdfParse(buffer);
  return data.text;
};
