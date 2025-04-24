import { db } from "@/db";
import { chunkEmbeddings } from "@/db/schema";
import { load } from "cheerio";

import { generateMultipleEmbeddings } from "./embedding-model";
import { splitIntoChunks } from "./text-chunker";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function recursiveCrawl(
  url: string,
  maxDepth: number,
  visited: Set<string>,
  knowledgeBaseId: string,
  agentId: string,
  trx: Parameters<Parameters<(typeof db)["transaction"]>[0]>[0],
  depth = 0,
) {
  if (depth > maxDepth || visited.has(url)) return;
  visited.add(url);

  console.log(`🕸️ Crawling: ${url} | Depth: ${depth}`);

  let html: string;
  try {
    const res = await fetch(url);
    html = await res.text();
  } catch {
    console.warn(`❌ Failed to fetch: ${url}`);
    return;
  }

  const $ = load(html);
  const baseDomain = new URL(url).origin;
  const text = $("body").text().replace(/\s+/g, " ").trim();
  const chunks = splitIntoChunks(text, 500);
  const embeddings = await generateMultipleEmbeddings(chunks);

  if (chunks.length === 0) {
    throw new Error("URL is not processable");
  }

  const insertData = embeddings.map((embedding, i) => ({
    knowledgeBaseId,
    agentId,
    contentChunk: chunks[i],
    embeddingVector: embedding,
    tokenCount: chunks[i].split(" ").length,
  }));

  await trx.insert(chunkEmbeddings).values(insertData);

  const links = $("a[href]")
    .map((_, el) => $(el).attr("href"))
    .get()
    .filter((href) => href && !href.startsWith("#"))
    .map((href) => new URL(href!, baseDomain).href);

  for (const link of [...new Set(links)]) {
    if (link.startsWith(baseDomain)) {
      await sleep(200);
      await recursiveCrawl(
        link,
        maxDepth,
        visited,
        knowledgeBaseId,
        agentId,
        trx,
        depth + 1,
      );
    }
  }
}
