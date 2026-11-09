"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AuthGate({ children, databaseConfigured }: { children: ReactNode; databaseConfigured: boolean }) {
  const client = getSupabaseBrowserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!client) {
      setReady(true);
      return;
    }
    void client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, [client]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return;
    setBusy(true);
    setMessage("");
    try {
      const result = creating
        ? await client.auth.signUp({ email: email.trim(), password })
        : await client.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) {
        setMessage(result.error.message);
        return;
      }
      if (creating && !result.data.session) {
        setMessage("Check your email to confirm your account, then sign in.");
      }
    } catch {
      setMessage("Could not reach Supabase Auth. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return <div className="grid h-dvh place-items-center bg-void text-sm text-muted">Loading workspace…</div>;
  }
  if (!databaseConfigured) {
    return (
      <main className="grid min-h-dvh place-items-center bg-void px-5 py-10 text-cream">
        <section className="w-full max-w-[480px] rounded-2xl border border-line bg-panel p-6 shadow-2xl">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-gold/30 bg-gold/10 font-display text-xl text-gold">k</span>
            <div>
              <p className="font-display text-xl tracking-tight">Kite Studio</p>
              <p className="text-xs text-muted">The app needs its database connection</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-cream-soft">
            The page can load, but saved projects, files, credits, and shared request limits need PostgreSQL.
          </p>
          <div className="mt-4 rounded-xl border border-line bg-panel-2 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-dim">Setup needed</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              In your Supabase dashboard, open <span className="text-cream-soft">Connect → Session pooler</span> and copy the PostgreSQL URI. Replace its <span className="font-mono text-cream-soft">[YOUR-PASSWORD]</span> placeholder with your database password, then add the URI as <span className="font-mono text-cream-soft">DATABASE_URL</span> in <span className="font-mono text-cream-soft">.env.local</span> and restart the dev server.
            </p>
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-muted-dim">
            This password is separate from the Supabase API keys. Keep the URI in the ignored local file; don’t paste the password into chat. Then apply the schema and secure-backend migration described in README.md.
          </p>
        </section>
      </main>
    );
  }
  if (session) return children;

  return (
    <main className="grid min-h-dvh place-items-center bg-void px-5 py-10 text-cream">
      <section className="w-full max-w-[420px] rounded-2xl border border-line bg-panel p-6 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-gold/30 bg-gold/10 font-display text-xl text-gold">k</span>
          <div>
            <p className="font-display text-xl tracking-tight">Kite Studio</p>
            <p className="text-xs text-muted">A no-code agent for real project files</p>
          </div>
        </div>

        {!client ? (
          <div className="rounded-xl border border-line bg-panel-2 p-4 text-sm leading-relaxed text-muted">
            Add <span className="font-mono text-cream-soft">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
            <span className="font-mono text-cream-soft">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</span> to your server environment to enable secure accounts.
          </div>
        ) : (
          <>
            <h1 className="text-lg">{creating ? "Create your account" : "Welcome back"}</h1>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Every account starts with 1,000,000 credits, enough for up to 500 model requests. Larger projects may use several requests.
            </p>
            <form onSubmit={submit} className="mt-5 space-y-3">
              <label className="block text-xs text-muted">
                Email
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-line bg-panel-2 px-3 text-sm text-cream outline-none focus:border-gold/50"
                />
              </label>
              <label className="block text-xs text-muted">
                Password
                <input
                  type="password"
                  autoComplete={creating ? "new-password" : "current-password"}
                  minLength={8}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-line bg-panel-2 px-3 text-sm text-cream outline-none focus:border-gold/50"
                />
              </label>
              {message ? <p role="status" className="text-xs leading-relaxed text-gold">{message}</p> : null}
              <button
                type="submit"
                disabled={busy}
                className="h-10 w-full rounded-lg border border-gold/40 bg-gold/10 text-sm text-cream transition hover:bg-gold/15 disabled:opacity-50"
              >
                {busy ? "Please wait…" : creating ? "Create account" : "Sign in"}
              </button>
            </form>
            <button
              type="button"
              onClick={() => {
                setCreating((value) => !value);
                setMessage("");
              }}
              className="mt-4 w-full text-center text-xs text-muted underline-offset-4 hover:text-cream hover:underline"
            >
              {creating ? "Already have an account? Sign in" : "New to Kite? Create an account"}
            </button>
          </>
        )}
      </section>
    </main>
  );
}
