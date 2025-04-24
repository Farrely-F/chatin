import { db } from "@/db";
import { withAuth } from "@/middleware/api-middleware";
import { ApiHandlerArgs } from "@/types/api";
import { NextResponse } from "next/server";

export async function handler(...args: ApiHandlerArgs) {
  const [req, { params }] = args;

  const { agentId } = await params;

  if (!req.authorized?.userId) {
    return NextResponse.json(
      { status: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const agent = await db.query.agents.findFirst({
      where: (agents, { eq, and }) =>
        and(
          eq(agents.id, agentId),
          eq(agents.userId, req.authorized?.userId as string),
        ),
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

export const GET = withAuth(handler, "read");
