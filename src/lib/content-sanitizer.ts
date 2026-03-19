type SanitizeOptions = {
  stripHtml?: boolean;
  removeInstructionPatterns?: boolean;
  escapeDelimiters?: boolean;
  maxLength?: number;
};

type SanitizeResult = {
  content: string;
  hadToSanitize: boolean;
  warnings: string[];
};

const INSTRUCTION_PATTERNS = [
  /\b(ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|rules?|constraints?))/gi,
  /\b(disregard\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|rules?|constraints?))/gi,
  /\b(you\s+are\s+now\s+)/gi,
  /\b(act\s+as\s+)/gi,
  /\b(pretend\s+you\s+are\s+)/gi,
  /\b(assume\s+you\s+are\s+)/gi,
  /\b(you\s+can\s+ignore\s+)/gi,
  /\b(ignore\s+all\s+previous\s+)/gi,
  /\b(disregard\s+your\s+)/gi,
  /\b(forget\s+your\s+)/gi,
  /^(system|prompt|instruction):/gim,
  /\[\s*(system|prompt|instruction)\s*\]/gi,
  /<\s*(system|prompt|instruction)\s*>/gi,
  /\{\s*"role"\s*:\s*"system"\s*\}/gi,
];

const DANGEROUS_TOKEN_PATTERNS = [/[<>]/g, /[\[\]{}]/g, /\\x/g, /\x00/g];

const DELIMITER_START = "[[KNOWLEDGE_BASE_CONTENT]]";
const DELIMITER_END = "[[/KNOWLEDGE_BASE_CONTENT]]";

function detectInstructionPatterns(text: string): string[] {
  const detected: string[] = [];

  for (const pattern of INSTRUCTION_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      detected.push(...matches);
    }
  }

  return detected;
}

function stripHtmlTags(content: string, warnings: string[]): string {
  const htmlPattern = /<[^>]*>/g;
  if (htmlPattern.test(content)) {
    warnings.push("Removed HTML tags");
    return content.replace(htmlPattern, "");
  }
  return content;
}

function stripScriptTags(content: string, warnings: string[]): string {
  const scriptPattern = /<script[^>]*>[\s\S]*?<\/script>/gi;
  if (scriptPattern.test(content)) {
    warnings.push("Removed script tags");
    return content.replace(scriptPattern, "");
  }
  return content;
}

function removeInstructionPatterns(
  content: string,
  warnings: string[],
): string {
  const detected = detectInstructionPatterns(content);
  if (detected.length === 0) {
    return content;
  }

  warnings.push(`Removed ${detected.length} instruction-following patterns`);

  let result = content;
  for (const pattern of INSTRUCTION_PATTERNS) {
    result = result.replace(pattern, "[removed]");
  }
  return result;
}

function escapeDelimiters(content: string, warnings: string[]): string {
  const delimiterPattern =
    /\[\[KNOWLEDGE_BASE_CONTENT\]\]|\[\[\/KNOWLEDGE_BASE_CONTENT\]\]/g;

  if (!delimiterPattern.test(content)) {
    return content;
  }

  warnings.push("Escaped delimiter markers");

  return content.replace(delimiterPattern, (match) => {
    if (match === DELIMITER_START) {
      return "[[ KNOWLEDGE_BASE_CONTENT ]]";
    }
    return "[[ /KNOWLEDGE_BASE_CONTENT ]]";
  });
}

function removeDangerousTokens(content: string, warnings: string[]): string {
  let result = content;

  for (const pattern of DANGEROUS_TOKEN_PATTERNS) {
    if (pattern.test(result)) {
      warnings.push("Removed dangerous tokens");
      result = result.replace(pattern, "?");
    }
  }

  return result;
}

function removeNullBytes(content: string): string {
  return content.replace(/\x00/g, "");
}

function truncateContent(
  content: string,
  maxLength: number,
  warnings: string[],
): string {
  if (content.length <= maxLength) {
    return content;
  }

  warnings.push(
    `Truncated content from ${content.length} to ${maxLength} chars`,
  );
  return content.substring(0, maxLength);
}

export function sanitizeContent(
  content: string,
  options: SanitizeOptions = {},
): SanitizeResult {
  const {
    stripHtml = true,
    removeInstructionPatterns: shouldRemoveInstructions = true,
    escapeDelimiters: shouldEscapeDelimiters = true,
    maxLength = 50000,
  } = options;

  const warnings: string[] = [];
  let sanitized = content;

  if (stripHtml) {
    sanitized = stripHtmlTags(sanitized, warnings);
    sanitized = stripScriptTags(sanitized, warnings);
  }

  if (shouldRemoveInstructions) {
    sanitized = removeInstructionPatterns(sanitized, warnings);
  }

  if (shouldEscapeDelimiters) {
    sanitized = escapeDelimiters(sanitized, warnings);
  }

  sanitized = removeDangerousTokens(sanitized, warnings);
  sanitized = removeNullBytes(sanitized);
  sanitized = truncateContent(sanitized, maxLength, warnings);
  sanitized = sanitized.trim();

  return {
    content: sanitized,
    hadToSanitize: warnings.length > 0,
    warnings,
  };
}

export function wrapWithDelimiters(content: string): string {
  return `${DELIMITER_START}\n${content}\n${DELIMITER_END}`;
}

export function stripDelimiters(content: string): string {
  const startPattern = /\[\[KNOWLEDGE_BASE_CONTENT\]\]\s*/g;
  const endPattern = /\s*\[\[\/KNOWLEDGE_BASE_CONTENT\]\]/g;

  return content.replace(startPattern, "").replace(endPattern, "").trim();
}

export { DELIMITER_START, DELIMITER_END };
export type { SanitizeOptions, SanitizeResult };
