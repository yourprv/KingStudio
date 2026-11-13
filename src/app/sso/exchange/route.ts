export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "Cross-origin sign-in is not allowed." }, { status: 403 });
  }

  const backendOrigin = process.env.BACKEND_ORIGIN?.trim();
  if (!backendOrigin) {
    return Response.json({ error: "Kite Studio sign-in is not configured." }, { status: 503 });
  }

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
    const destination = new URL("/api/auth/sso/exchange", backendOrigin);
    if (destination.protocol !== "https:" && destination.hostname !== "localhost") {
      return Response.json({ error: "Kite Studio backend URL must use HTTPS." }, { status: 503 });
    }

    const upstream = await fetch(destination, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
    });
    const payload = await upstream.json().catch(() => null) as { error?: unknown; user?: unknown } | null;
    const responsePayload = payload && typeof payload === "object"
      ? payload
      : { error: `Kite Studio backend returned HTTP ${upstream.status} while checking this sign-in.` };
    const headers = new Headers({ "Cache-Control": "no-store" });
    const setCookies = (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.();
    if (setCookies?.length) {
      for (const cookie of setCookies) headers.append("Set-Cookie", cookie);
    } else {
      const setCookie = upstream.headers.get("set-cookie");
      if (setCookie) headers.append("Set-Cookie", setCookie);
    }
    return Response.json(responsePayload, { status: upstream.status, headers });
  } catch {
    return Response.json({ error: "Could not reach the Kite Studio backend to verify this sign-in." }, { status: 502 });
  }
}
