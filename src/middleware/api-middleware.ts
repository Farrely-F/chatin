import { verifyApiKey } from "@/service/api-key";
import { Authorized } from "@/types/api";
import { NextRequest, NextResponse } from "next/server";

const AUTHORIZED_DOMAIN = process.env.AUTHORIZED_DOMAIN ?? "";

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
    const host = req.headers.get("host");

    if (!host?.includes(AUTHORIZED_DOMAIN)) {
      const authHeader = req.headers.get("Authorization");
      const token = authHeader?.split("Bearer ")[1];

      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const authorized = await verifyApiKey(token);

      const unauthorized =
        !authorized ||
        authorized.revoked ||
        !authorized.userId ||
        !authorized.scopes?.includes(scopes);

      if (unauthorized) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const reqWithAuth = Object.assign(req, { authorized });
      return handler(reqWithAuth, context);
    }

    return handler(req, context);
  };
}
