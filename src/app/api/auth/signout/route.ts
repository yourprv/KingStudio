import { KITE_SESSION_COOKIE } from "@/lib/auth/kite-session";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "Cross-origin sign-out is not allowed." }, { status: 403 });
  }
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const headers = new Headers();
  headers.append("Set-Cookie", `${KITE_SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
  return Response.json({ signedOut: true }, { headers });
}
