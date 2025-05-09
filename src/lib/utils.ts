import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .normalize("NFKD") // remove diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove non-alphanumeric and non-hyphen
    .replace(/\s+/g, "-") // convert spaces to hyphens
    .replace(/-+/g, "-") // collapse multiple hyphens
    .replace(/^-+|-+$/g, ""); // trim hyphens from start and end
}

export function truncateWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "...";
}

export function truncateCharacters(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

// v1 Cleaner
// export function cleanText(text: string): string {
//   return text
//     .toLowerCase()
//     .normalize("NFKC")
//     .replace(/[\r\n\t]+/g, " ") // Replace newlines and tabs with a space
//     .replace(/\s+/g, " ") // Collapse multiple spaces into a single space
//     .trim(); // Remove leading and trailing whitespace
// }

// v2 Cleaner
export function cleanText(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\r\n\t]+/g, " ") // Replace newlines and tabs with space
    .replace(/\.{2,}/g, ".") // Replace repeated dots (e.g., ..........) with a single dot
    .replace(/[-–—]\s+/g, "") // Remove hyphenation from line-breaks (PDF artifacts)
    .replace(/\s{2,}/g, " ") // Collapse multiple spaces
    .replace(/\s+([.,;:!?])/g, "$1") // Remove space before punctuation
    .replace(/([a-zA-Z])\s+([0-9])/g, "$1 $2") // Avoid merging letters and numbers
    .replace(/\s+\./g, ".") // Remove spaces before dots
    .trim();
}
