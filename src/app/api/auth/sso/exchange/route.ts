import { createKiteSession, KITE_SESSION_COOKIE } from "@/lib/auth/kite-session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "Cross-origin sign-in is not allowed." }, { status: 403 });
  }

  const apiUrl = process.env.PRV_API_URL?.trim();
  const sharedSecret = process.env.KITE_SSO_SHARED_SECRET?.trim();
  if (!apiUrl || !sharedSecret) return Response.json({ error: "PRV AI sign-in is not configured." }, { status: 503 });

  let code = "";
  try {
    const body = await request.json() as { code?: unknown };
    code = typeof body.code === "string" ? body.code : "";
  } catch {
    return Response.json({ error: "Invalid sign-in request." }, { status: 400 });
  }
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(code)) {
    return Response.json({ error: "This PRV AI sign-in link is invalid or expired." }, { status: 401 });
  }

  try {
    const response = await fetch(new URL("/api/kite/sso/redeem", apiUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-kite-sso-secret": sharedSecret },
      body: JSON.stringify({ code }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: unknown } | null;
      const message = typeof payload?.error === "string"
        ? payload.error
        : `PRV AI sign-in service returned HTTP ${response.status}.`;
      const status = response.status === 401 ? 401 : response.status === 503 ? 503 : 502;
      return Response.json({ error: message }, { status });
    }
    const payload = await response.json() as { user?: { id?: unknown; email?: unknown } };
    const user = payload.user;
    if (!user || typeof user.id !== "string" || !user.id || (user.email !== undefined && typeof user.email !== "string")) {
      return Response.json({ error: "PRV AI returned an invalid sign-in response." }, { status: 502 });
    }
    const { token, maxAge } = createKiteSession({ sub: user.id, ...(user.email ? { email: user.email } : {}) });
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    const headers = new Headers();
    headers.append("Set-Cookie", `${KITE_SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`);
    return Response.json({ user: { id: user.id, ...(user.email ? { email: user.email } : {}) } }, { headers });
  } catch {
    return Response.json({ error: "Could not reach PRV AI to verify this sign-in." }, { status: 502 });
  }
}
