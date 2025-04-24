import type { NextRequest } from "next/server";

type Authorized = {
  id: string;
  name: string | null;
  createdAt: Date | null;
  userId: string;
  key: string;
  scopes: string[] | null;
  expiresAt: Date | null;
  revoked: boolean | null;
};

type ApiHandlerArgs = [
  req: NextRequest & { authorized?: Authorized },
  context: { params: Promise<{ agentId: string }> },
];
