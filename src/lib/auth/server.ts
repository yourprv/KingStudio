import { createClient, type User } from "@supabase/supabase-js";

export type AuthenticatedUser = Pick<User, "id" | "email">;

let authClient: ReturnType<typeof createClient> | null = null;

function getAuthClient() {
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  if (!authClient) {
    authClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return authClient;
}

/** Validates the caller's bearer token with Supabase Auth. Never trusts client-supplied user IDs. */
export async function getAuthenticatedUser(request: Request): Promise<AuthenticatedUser | null> {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) return null;
  const client = getAuthClient();
  if (!client) return null;

  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id, ...(data.user.email ? { email: data.user.email } : {}) };
  } catch {
    return null;
  }
}

export function unauthorized() {
  return Response.json({ error: "Sign in to continue." }, { status: 401 });
}
