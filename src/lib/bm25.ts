type Document = {
  id: string;
  content: string;
};

type Bm25Score = {
  id: string;
  content: string;
  score: number;
};

type Bm25Params = {
  k1?: number;
  b?: number;
};

const DEFAULT_K1 = 1.5;
const DEFAULT_B = 0.75;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function computeTermFrequencies(tokens: string[]): Map<string, number> {
  const frequencies = new Map<string, number>();
  for (const token of tokens) {
    frequencies.set(token, (frequencies.get(token) || 0) + 1);
  }
  return frequencies;
}

function computeInverseDocumentFrequency(
  documents: string[][],
  term: string,
): number {
  const docCount = documents.length;
  let docFreq = 0;

  for (const docTokens of documents) {
    if (docTokens.includes(term)) {
      docFreq++;
    }
  }

  if (docFreq === 0) return 0;
  return Math.log((docCount - docFreq + 0.5) / (docFreq + 0.5) + 1);
}

export function createBm25Index(
  documents: Document[],
  params: Bm25Params = {},
) {
  const k1 = params.k1 ?? DEFAULT_K1;
  const b = params.b ?? DEFAULT_B;

  const tokenizedDocs = documents.map((doc) => tokenize(doc.content));
  const avgDocLen =
    tokenizedDocs.reduce((sum, doc) => sum + doc.length, 0) /
    (tokenizedDocs.length || 1);

  const idfCache = new Map<string, number>();
  const termDocsCache = tokenizedDocs.map((doc) => computeTermFrequencies(doc));

  return {
    search(query: string, topK = 5): Bm25Score[] {
      const queryTokens = tokenize(query);
      if (queryTokens.length === 0) return [];

      const scores = new Map<string, { content: string; score: number }>();

      for (let docIdx = 0; docIdx < documents.length; docIdx++) {
        const doc = documents[docIdx];
        const docTokens = tokenizedDocs[docIdx];
        const termFreqs = termDocsCache[docIdx];
        const docLen = docTokens.length;

        let docScore = 0;

        for (const term of queryTokens) {
          const tf = termFreqs.get(term) || 0;
          if (tf === 0) continue;

          let idf = idfCache.get(term);
          if (idf === undefined) {
            idf = computeInverseDocumentFrequency(tokenizedDocs, term);
            idfCache.set(term, idf);
          }

          const numerator = tf * (k1 + 1);
          const denominator = tf + k1 * (1 - b + (b * docLen) / avgDocLen);
          docScore += idf * (numerator / denominator);
        }

        if (docScore > 0) {
          scores.set(doc.id, { content: doc.content, score: docScore });
        }
      }

      return Array.from(scores.entries())
        .map(([id, { content, score }]) => ({ id, content, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    },
  };
}

export function normalizeScores(scores: Bm25Score[]): Bm25Score[] {
  if (scores.length === 0) return [];

  const maxScore = Math.max(...scores.map((s) => s.score));
  const minScore = Math.min(...scores.map((s) => s.score));

  if (maxScore === minScore) {
    return scores.map((s) => ({ ...s, score: 1 }));
  }

  return scores.map((s) => ({
    ...s,
    score: (s.score - minScore) / (maxScore - minScore),
  }));
}

export type { Document, Bm25Score };
