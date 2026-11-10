import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_TTL_SECONDS = 12 * 60 * 60;

export type KiteSessionClaims = { sub: string; email?: string; exp: number };

function sessionSecret() {
  const secret = process.env.KITE_SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) throw new Error("KITE_SESSION_SECRET must contain at least 32 characters.");
  return secret;
}

function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function createKiteSession(claims: Omit<KiteSessionClaims, "exp">) {
  const payload = Buffer.from(JSON.stringify({ ...claims, exp: Math.floor(Date.now() / 1_000) + SESSION_TTL_SECONDS })).toString("base64url");
  return { token: `${payload}.${sign(payload)}`, maxAge: SESSION_TTL_SECONDS };
}

export function verifyKiteSession(token: string | undefined): KiteSessionClaims | null {
  if (!token || token.length > 4_096) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  try {
    const expected = Buffer.from(sign(payload));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<KiteSessionClaims>;
    if (typeof claims.sub !== "string" || !claims.sub || typeof claims.exp !== "number" || claims.exp <= Date.now() / 1_000) return null;
    if (claims.email !== undefined && typeof claims.email !== "string") return null;
    return { sub: claims.sub, ...(claims.email ? { email: claims.email } : {}), exp: claims.exp };
  } catch {
    return null;
  }
}

export const KITE_SESSION_COOKIE = "kite_session";
