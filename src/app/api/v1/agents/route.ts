import { withAuth } from "@/middleware/api-middleware";
import { getAllAgentWithModel } from "@/service/agents";
import { ApiHandlerArgs } from "@/types/api";
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

  try {
    const tenantScopedAgents = await getAllAgentWithModel(
      req.authorized.userId,
    );
    const results = (tenantScopedAgents ?? []).filter((agent) => {
      if (name && !agent.name.toLowerCase().includes(name.toLowerCase())) {
        return false;
      }

      if (status && agent.status !== status) {
        return false;
      }

      if (model_id && agent.modelId !== model_id) {
        return false;
      }

      return true;
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
