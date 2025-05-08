import { db } from "@/db";
import { chunkEmbeddings } from "@/db/schema";
import { load } from "cheerio";

import { generateMultipleEmbeddings } from "./embedding-model";
import { splitIntoChunks } from "./text-chunker";

interface CrawlOptions {
  maxDepth: number;
  knowledgeBaseId: string;
  agentId: string;
  trx: Parameters<Parameters<typeof db.transaction>[0]>[0];
  sleepMs?: number;
}

const blockTags = [
  "button",
  "p",
  "div",
  "br",
  "li",
  "section",
  "article",
  "header",
  "footer",
  "aside",
  "nav",
  "main",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "table",
  "tr",
  "td",
  "th",
];

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    return await res.text();
  } catch {
    console.warn(`❌ Failed to fetch: ${url}`);
    return null;
  }
}

export function extractCleanText(html: string): string {
  const $ = load(html);

  // Remove unwanted nodes
  $("script, style, noscript").remove();
  $("*")
    .contents()
    .each((_, node) => {
      if (node.type === "comment") $(node).remove();
    });
  $(
    "header, footer, nav, .cookie-banner, .subscribe-popup, #drawer-menu",
  ).remove();

  // Add spacing after block elements
  blockTags.forEach((tag) => {
    $(tag).after("\n");
  });

  // Collapse excessive whitespace
  let text = $("body").text();
  text = text.replace(/\s+\n/g, "\n"); // remove trailing spaces before newlines
  text = text.replace(/\n\s+/g, "\n"); // remove leading spaces after newlines
  text = text.replace(/\n{2,}/g, "\n\n"); // collapse multiple newlines
  text = text.trim(); // trim start/end whitespace

  console.log(text);

  return text;
}

export async function recursiveCrawl(
  url: string,
  visited: Set<string>,
  depth: number,
  opts: CrawlOptions,
): Promise<void> {
  const { maxDepth, knowledgeBaseId, agentId, trx, sleepMs = 200 } = opts;
  if (depth > maxDepth || visited.has(url)) return;
  visited.add(url);

  console.log(`🕸️ Crawling: ${url} | Depth: ${depth}`);

  const html = await fetchHtml(url);
  if (!html) return;

  const text = extractCleanText(html);
  if (!text) throw new Error("URL is not processable");

  // chunk + embed + insert
  const chunks = await splitIntoChunks(text, {
    chunkSize: 500,
  });
  const embeddings = await generateMultipleEmbeddings(chunks);

  if (embeddings.length === 0) throw new Error("Embedding failed");

  const chunkRows = chunks.map((chunk, index) => ({
    agentId,
    knowledgeBaseId,
    contentChunk: chunk,
    embeddingVector: embeddings[index],
    tokenCount: chunk.split(" ").length,
  }));

  await trx.insert(chunkEmbeddings).values(chunkRows);

  // extract, normalize, dedupe links
  const $ = load(html);
  const base = new URL(url).origin;
  const links = new Set(
    $("a[href]")
      .map((_, el) => $(el).attr("href"))
      .get()
      .filter((href): href is string => !!href && !href.startsWith("#"))
      .map((href) => new URL(href, base).href),
  );

  for (const link of links) {
    if (link.startsWith(base)) {
      await new Promise((r) => setTimeout(r, sleepMs));
      await recursiveCrawl(link, visited, depth + 1, opts);
    }
  }
}
