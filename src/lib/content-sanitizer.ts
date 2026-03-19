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

export function sanitizeContent(
  content: string,
  options: SanitizeOptions = {},
): SanitizeResult {
  const {
    stripHtml = true,
    removeInstructionPatterns = true,
    escapeDelimiters = true,
    maxLength = 50000,
  } = options;

  const warnings: string[] = [];
  let hadToSanitize = false;
  let sanitized = content;

  if (stripHtml) {
    const htmlPattern = /<[^>]*>/g;
    if (htmlPattern.test(sanitized)) {
      hadToSanitize = true;
      warnings.push("Removed HTML tags");
      sanitized = sanitized.replace(htmlPattern, "");
    }

    const scriptPattern = /<script[^>]*>[\s\S]*?<\/script>/gi;
    if (scriptPattern.test(sanitized)) {
      hadToSanitize = true;
      warnings.push("Removed script tags");
      sanitized = sanitized.replace(scriptPattern, "");
    }
  }

  if (removeInstructionPatterns) {
    const detected = detectInstructionPatterns(sanitized);
    if (detected.length > 0) {
      hadToSanitize = true;
      warnings.push(
        `Removed ${detected.length} instruction-following patterns`,
      );
      for (const pattern of INSTRUCTION_PATTERNS) {
        sanitized = sanitized.replace(pattern, "[removed]");
      }
    }
  }

  if (escapeDelimiters) {
    const delimiterPattern =
      /\[\[KNOWLEDGE_BASE_CONTENT\]\]|\[\[\/KNOWLEDGE_BASE_CONTENT\]\]/g;
    if (delimiterPattern.test(sanitized)) {
      hadToSanitize = true;
      warnings.push("Escaped delimiter markers");
      sanitized = sanitized.replace(delimiterPattern, (match) => {
        if (match === DELIMITER_START) return "[[ KNOWLEDGE_BASE_CONTENT ]]";
        return "[[ /KNOWLEDGE_BASE_CONTENT ]]";
      });
    }
  }

  for (const pattern of DANGEROUS_TOKEN_PATTERNS) {
    if (pattern.test(sanitized)) {
      hadToSanitize = true;
      sanitized = sanitized.replace(pattern, "?");
    }
  }

  sanitized = sanitized.replace(/\x00/g, "");

  if (sanitized.length > maxLength) {
    hadToSanitize = true;
    warnings.push(
      `Truncated content from ${sanitized.length} to ${maxLength} chars`,
    );
    sanitized = sanitized.substring(0, maxLength);
  }

  sanitized = sanitized.trim();

  return {
    content: sanitized,
    hadToSanitize,
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
