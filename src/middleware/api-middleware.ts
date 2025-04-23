import { verifyApiKey } from "@/service/api-key";
import { NextRequest } from "next/server";

const AUHTORIZED_DOMAIN = process.env.AUTHORIZED_DOMAIN!;

export async function withAuth(req: NextRequest) {
  const host = req.headers.get("host");

  if (!host?.includes(AUHTORIZED_DOMAIN)) {
    const token = req.headers.get("Authorization")?.split("Bearer ")[1];

    if (!token) {
      return null;
    }

    const isValidToken = await verifyApiKey(token);

    if (!isValidToken || isValidToken.revoked) {
      return null;
    }
    return isValidToken;
  }
}
