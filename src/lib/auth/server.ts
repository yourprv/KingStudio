import { KITE_SESSION_COOKIE, verifyKiteSession } from "./kite-session";

export type AccountTier = "free" | "go" | "plus" | "pro";
export type AuthenticatedUser = { id: string; email?: string; tier: AccountTier };

const isTier = (tier: unknown): tier is AccountTier =>
  tier === "free" || tier === "go" || tier === "plus" || tier === "pro";

function readCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return undefined;
}

/** Validates Kite's own HttpOnly session, then gets the current plan from PRV AI server-to-server. */
export async function getAuthenticatedUser(request: Request): Promise<AuthenticatedUser | null> {
  const session = verifyKiteSession(readCookie(request, KITE_SESSION_COOKIE));
  const prvApiUrl = process.env.PRV_API_URL?.trim();
  const sharedSecret = process.env.KITE_SSO_SHARED_SECRET?.trim();
  if (!session || !prvApiUrl || !sharedSecret) return null;

  try {
    const response = await fetch(new URL("/api/kite/entitlement", prvApiUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-kite-sso-secret": sharedSecret },
      body: JSON.stringify({ prvUserId: session.sub }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;
    const payload = await response.json() as { tier?: unknown };
    if (!isTier(payload.tier)) return null;
    return { id: session.sub, ...(session.email ? { email: session.email } : {}), tier: payload.tier };
  } catch {
    return null;
  }
}

export function unauthorized() {
  return Response.json({ error: "Sign in through PRV AI to continue." }, { status: 401 });
}
