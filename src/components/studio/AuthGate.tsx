"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/supabase/client";

const PRV_LOGIN_URL = "https://prvai.vercel.app/";

export default function AuthGate({ children, databaseConfigured }: { children: ReactNode; databaseConfigured: boolean }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("Open Kite Studio from PRV AI to sign in automatically.");
  const [busy, setBusy] = useState(false);
  const ssoExchangeRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (!databaseConfigured) return;
    let cancelled = false;
    const exchangeCode = (code: string) => {
      if (!ssoExchangeRef.current) {
        ssoExchangeRef.current = (async () => {
          const response = await apiFetch("/sso/exchange", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
          });
          if (!response.ok) {
            const payload = await response.json().catch(() => null) as { error?: unknown } | null;
            const error = typeof payload?.error === "string"
              ? payload.error
              : "Kite could not verify this PRV AI sign-in. Open Kite again from PRV AI.";
            throw new Error(error);
          }
        })();
      }
      return ssoExchangeRef.current;
    };

    const validateSessionOrExchangeCode = async () => {
      const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const code = params.get("sso");
      if (code) {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      }

      if (code || ssoExchangeRef.current) {
        setBusy(true);
        try {
          await (code ? exchangeCode(code) : ssoExchangeRef.current);
          if (!cancelled) setAuthenticated(true);
        } catch (error) {
          if (!cancelled) setMessage(error instanceof Error ? error.message : "Could not verify the PRV AI sign-in.");
        } finally {
          if (!cancelled) {
            setBusy(false);
            setReady(true);
          }
        }
        return;
      }

      try {
        const response = await apiFetch("/api/account", { cache: "no-store" });
        if (response.ok && !cancelled) {
          setAuthenticated(true);
          setReady(true);
          return;
        }
      } catch {
        // A direct visit without a Kite session continues to the sign-in handoff.
      }
      if (!cancelled) setReady(true);
    };
    void validateSessionOrExchangeCode();
    return () => { cancelled = true; };
  }, [databaseConfigured]);

  if (databaseConfigured && !ready) {
    return <div className="grid h-dvh place-items-center bg-void text-sm text-muted">{busy ? "Verifying your PRV AI sign-in…" : "Loading workspace…"}</div>;
  }
  if (!databaseConfigured) {
    return (
      <main className="grid min-h-dvh place-items-center bg-void px-5 py-10 text-cream">
        <section className="w-full max-w-[480px] rounded-2xl border border-line bg-panel p-6 shadow-2xl">
          <p className="font-display text-xl tracking-tight">Kite Studio</p>
          <p className="mt-2 text-sm leading-relaxed text-cream-soft">The project database is not configured. Set DATABASE_URL and restart the app.</p>
        </section>
      </main>
    );
  }
  if (authenticated) return children;

  return (
    <main className="grid min-h-dvh place-items-center bg-void px-5 py-10 text-cream">
      <section className="w-full max-w-[420px] rounded-2xl border border-line bg-panel p-6 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-gold/30 bg-gold/10 font-display text-xl text-gold">k</span>
          <div>
            <p className="font-display text-xl tracking-tight">Kite Studio</p>
            <p className="text-xs text-muted">Included with your PRV AI account</p>
          </div>
        </div>
        <h1 className="text-lg">Continue with PRV AI</h1>
        <p role="status" className="mt-2 text-xs leading-relaxed text-muted">{busy ? "Verifying the one-time PRV AI sign-in…" : message}</p>
        <a
          href={PRV_LOGIN_URL}
          className="mt-5 flex h-10 items-center justify-center rounded-lg border border-gold/40 bg-gold/10 text-sm text-cream transition hover:bg-gold/15"
        >
          Open PRV AI, then choose Kite Studio
        </a>
        <p className="mt-4 text-[10.5px] leading-relaxed text-muted-dim">PRV issues a one-time sign-in code. Kite exchanges it server-to-server and creates its own short-lived session; PRV session tokens are never sent to Kite.</p>
      </section>
    </main>
  );
}
