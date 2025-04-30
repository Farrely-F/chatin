import { db } from "@/db";
import { agents } from "@/db/schema";
import { withAuth } from "@/middleware/api-middleware";
import { ApiHandlerArgs } from "@/types/api";
import { and, eq, ilike } from "drizzle-orm";
import { NextResponse } from "next/server";

type SearchParams = {
  name?: string;
  status?: "active" | "archived";
  model_id?: string;
};

async function handler(...args: ApiHandlerArgs) {
  const [req] = args;

  if (!req.authorized?.userId) {
    return NextResponse.json(
      { status: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());

  const { name, status, model_id } = searchParams as SearchParams;

  const conditions = [];
  if (name) conditions.push(ilike(agents.name, `%${name}%`));
  if (status) conditions.push(eq(agents.status, status));
  if (model_id) conditions.push(eq(agents.modelId, model_id));

  try {
    const results = await db.query.agents.findMany({
      with: {
        model: true,
      },
      where: conditions.length
        ? and(eq(agents.userId, req.authorized.userId), ...conditions)
        : undefined,
    });

    return NextResponse.json({ status: true, data: results }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        status: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export const GET = withAuth(handler, "read");
