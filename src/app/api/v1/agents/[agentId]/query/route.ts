import { searchSimilarChunks } from "@/lib/similarity-search";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (
  req: NextRequest,
  { params }: { params: { agentId: string } },
) => {
  const { query } = await req.json();

  if (!query) {
    return NextResponse.json(
      { error: "Missing query or knowledgeBaseId" },
      { status: 400 },
    );
  }

  const results = await searchSimilarChunks({
    query,
    agentId: params.agentId,
  });

  return NextResponse.json({ results });
};
