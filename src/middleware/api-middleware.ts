import { db } from "@/db";
import { agents, organizationMembers } from "@/db/schema";
import { auth } from "@/lib/auth/auth";
import { verifyApiKey } from "@/service/api-key";
import { Authorized } from "@/types/api";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const AUTHORIZED_DOMAIN = process.env.AUTHORIZED_DOMAIN ?? "";

function buildSessionAuthorized(userId: string, scopes: string[]) {
  return {
    id: `session:${userId}`,
    name: "session-user",
    createdAt: new Date(),
    userId,
    key: "session",
    scopes,
    expiresAt: null,
    revoked: false,
  } as Authorized;
}

export async function getRequestUserId(
  req: NextRequest & { authorized?: Authorized },
) {
  if (req.authorized?.userId) {
    return req.authorized.userId;
  }

  const session = await auth();
  return session?.user?.id ?? null;
}

export async function canAccessAgentById(
  req: NextRequest & { authorized?: Authorized },
  agentId: string,
) {
  const userId = await getRequestUserId(req);

  if (!userId) {
    return { allowed: false as const };
  }

  const [agent] = await db
    .select({
      id: agents.id,
      userId: agents.userId,
      organizationId: agents.organizationId,
    })
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  if (!agent) {
    return { allowed: false as const, userId };
  }

  if (!agent.organizationId) {
    return {
      allowed: agent.userId === userId,
      userId,
      organizationId: undefined,
      ownerUserId: agent.userId,
    };
  }

  if (agent.userId === userId) {
    return {
      allowed: true as const,
      userId,
      organizationId: agent.organizationId,
      ownerUserId: agent.userId,
    };
  }

  const [membership] = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, agent.organizationId),
        eq(organizationMembers.userId, userId),
      ),
    )
    .limit(1);

  return {
    allowed: Boolean(membership),
    userId,
    organizationId: agent.organizationId,
    ownerUserId: agent.userId,
  };
}

/**
 * Middleware to protect routes by verifying authentication and authorization.
 *
 * @template Ctx - The context type which extends an object with a promise of
 * parameters as a record of strings.
 *
 * @param handler - The function to handle the request. Receives a request
 * object extended with an optional `authorized` property and a context.
 *
 * @param scopes - The required scopes for accessing the route. Can be "chat",
 * "read", or "write".
 *
 * @returns A function that processes the request and checks for authentication
 * and authorization. If the host is not authorized or the API key is invalid,
 * it returns a 401 Unauthorized response. Otherwise, it proceeds with the
 * handler function.
 */

export function withAuth<
  Ctx extends { params: Promise<Record<string, string>> },
>(
  handler: (
    req: NextRequest & { authorized?: Authorized },
    context: Ctx,
  ) => Promise<Response>,
  scopes: "chat" | "read" | "write",
) {
  return async (req: NextRequest, context: Ctx): Promise<Response> => {
    const origin =
      req.headers.get("origin") || req.headers.get("referer") || "";
    const host = req.headers.get("host") || "";
    const isInternalRequest =
      (AUTHORIZED_DOMAIN && origin.includes(AUTHORIZED_DOMAIN)) ||
      (AUTHORIZED_DOMAIN && host.includes(AUTHORIZED_DOMAIN));

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.split("Bearer ")[1];

    if (token) {
      const authorized = await verifyApiKey(token);

      const unauthorized =
        !authorized ||
        authorized.revoked ||
        !authorized.userId ||
        !authorized.scopes?.includes(scopes);

      if (unauthorized) {
        return NextResponse.json(
          { status: false, error: "Invalid API Key" },
          { status: 401 },
        );
      }

      const reqWithAuth = Object.assign(req, { authorized });
      return handler(reqWithAuth, context);
    }

    if (isInternalRequest) {
      const session = await auth();

      if (!session?.user?.id) {
        return NextResponse.json(
          { status: false, error: "Unauthorized" },
          { status: 401 },
        );
      }

      const reqWithAuth = Object.assign(req, {
        authorized: buildSessionAuthorized(session.user.id, [scopes]),
      });

      return handler(reqWithAuth, context);
    }

    return NextResponse.json(
      { status: false, error: "Missing API Key" },
      { status: 401 },
    );
  };
}
