import { db } from "@/db";
import { withAuth } from "@/middleware/api-middleware";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await params;

  const authorized = await withAuth(req);

  if (!authorized) {
    return NextResponse.json(
      { status: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const agent = await db.query.agents.findFirst({
      where: (agents, { eq, and }) =>
        and(eq(agents.id, agentId), eq(agents.userId, authorized.userId)),
      with: {
        knowledgeBases: {
          columns: {
            contentText: false,
            agentId: false,
            embeddingStatus: false,
          },
        },
        personas: {
          columns: {
            userId: false,
          },
        },
        model: true,
      },
      columns: {
        modelId: false,
        userId: false,
        personaId: false,
      },
    });

    if (!agent) {
      return NextResponse.json(
        { status: false, error: "Agent not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ status: true, data: agent }, { status: 200 });
  } catch {
    return NextResponse.json(
      { status: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
