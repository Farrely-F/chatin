import { searchSimilarChunks } from "@/lib/similarity-search";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (
  req: NextRequest,
  { params }: { params: { agentId: string } },
) => {
  const { query, knowledgeBaseId } = await req.json();

  if (!query || !knowledgeBaseId) {
    return NextResponse.json(
      { error: "Missing query or knowledgeBaseId" },
      { status: 400 },
    );
  }

  const results = await searchSimilarChunks({
    query,
    agentId: params.agentId,
    knowledgeBaseId,
  });

  return NextResponse.json({ results });
};
