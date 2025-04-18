import * as jwt from "jose";

export async function verifyJWT(token: string) {
  try {
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET as string,
    );
    const { payload } = await jwt.jwtVerify(token, secret);
    return payload;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function signJWT(payload: Record<string, unknown>) {
  const secret = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET as string,
  );
  const token = await new jwt.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);
  return token;
}
