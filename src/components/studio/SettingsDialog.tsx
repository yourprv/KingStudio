"use client";

import { useEffect } from "react";
import type { CreditSnapshot, EngineConfig, QuotaSnapshot } from "@/lib/types";
import { Close, Database, Flame } from "./icons";

type Props = {
  open: boolean;
  onClose: () => void;
  config: EngineConfig;
  rate: { used: number; limit: number; remaining: number } | null;
  credits: CreditSnapshot;
  quota: QuotaSnapshot | null;
  accountEmail: string;
  onSignOut: () => void;
};

export default function SettingsDialog({ open, onClose, config, rate, credits, quota, accountEmail, onSignOut }: Props) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="fade-up my-auto w-full max-w-[620px] overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_40px_120px_-40px_rgba(0,0,0,1)]">
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <p className="text-[9.5px] uppercase tracking-[0.2em] text-muted-dim">Workspace settings</p>
            <h2 className="mt-1 text-[19px] tracking-tight text-cream">
              Engine &amp; <span className="serif-accent text-[21px]">storage</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="grid h-7 w-7 place-items-center rounded-md border border-line text-muted hover:text-cream"
          >
            <Close size={14} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <section className="rounded-xl border border-line bg-panel/70 p-3.5">
            <div className="flex items-center gap-2">
              <Flame size={14} className="text-gold" />
              <p className="text-[12.5px] text-cream">Generation engine</p>
              <span
                className={`ml-auto rounded-full border px-2 py-[2px] text-[9px] uppercase tracking-[0.12em] ${
                  config.configured
                    ? "border-gold/40 bg-gold/10 text-gold"
                    : "border-line text-muted-dim"
                }`}
              >
                {config.configured ? "Opal" : "Local"}
              </span>
            </div>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">{config.hint}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-line bg-panel-2 px-2.5 py-2">
                <p className="text-[9px] uppercase tracking-[0.14em] text-muted-dim">Model</p>
                <p className="mt-0.5 truncate font-mono text-[11px] text-cream-soft">{config.model}</p>
              </div>
              <div className="rounded-lg border border-line bg-panel-2 px-2.5 py-2">
                <p className="text-[9px] uppercase tracking-[0.14em] text-muted-dim">Limit</p>
                <p className="mt-0.5 font-mono text-[11px] text-cream-soft">{config.rpm} req / min</p>
              </div>
              <div className="rounded-lg border border-line bg-panel-2 px-2.5 py-2">
                <p className="text-[9px] uppercase tracking-[0.14em] text-muted-dim">This minute</p>
                <p className="mt-0.5 font-mono text-[11px] text-cream-soft">
                  {rate ? `${rate.used} used · ${rate.remaining} left` : "—"}
                </p>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg border border-line bg-panel-2 px-2.5 py-2">
                <p className="text-[9px] uppercase tracking-[0.14em] text-muted-dim">Credits left</p>
                <p className="mt-0.5 font-mono text-[11px] text-cream-soft">{credits.balance.toLocaleString()} / {credits.granted.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-line bg-panel-2 px-2.5 py-2">
                <p className="text-[9px] uppercase tracking-[0.14em] text-muted-dim">Per request</p>
                <p className="mt-0.5 font-mono text-[11px] text-cream-soft">{credits.requestCost.toLocaleString()} credits · {credits.requestsUsed}/500 used</p>
              </div>
              <div className="rounded-lg border border-line bg-panel-2 px-2.5 py-2">
                <p className="text-[9px] uppercase tracking-[0.14em] text-muted-dim">Shared today</p>
                <p className="mt-0.5 font-mono text-[11px] text-cream-soft">{quota ? `${quota.daily.used} / ${quota.daily.limit}` : `0 / ${config.rpd}`}</p>
              </div>
              <div className="rounded-lg border border-line bg-panel-2 px-2.5 py-2">
                <p className="text-[9px] uppercase tracking-[0.14em] text-muted-dim">Tokens this minute</p>
                <p className="mt-0.5 font-mono text-[11px] text-cream-soft">{quota ? `${quota.tokens.used.toLocaleString()} / ${quota.tokens.limit.toLocaleString()}` : `0 / ${config.tpm.toLocaleString()}`}</p>
              </div>
            </div>
            <p className="mt-2 text-[10.5px] leading-relaxed text-muted-dim">
              Every account starts with 1,000,000 credits. Each model request costs 2,000 credits, for up to 500 requests per account. Larger projects may use several requests. The shared daily allowance resets at midnight Pacific Time.
            </p>
          </section>

          <section className="rounded-xl border border-line bg-panel/70 p-3.5">
            <div className="flex items-center gap-2">
              <Database size={14} className="text-gold" />
              <p className="text-[12.5px] text-cream">File storage</p>
              <span className="ml-auto rounded-full border border-line px-2 py-[2px] text-[9px] uppercase tracking-[0.12em] text-muted-dim">
                {config.storage.provider}
              </span>
            </div>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
            Every file lives in Postgres as the source of truth and is mirrored to the{" "}
              <span className="font-mono text-cream-soft">{config.storage.bucket}</span> Supabase
              bucket when credentials are present. Folder structure is preserved in the object
              path, so the tree you see matches the bucket exactly.
            </p>
          </section>

          <p className="text-[10.5px] leading-relaxed text-muted-dim">
            Builds are planned first, then files are generated in small batches. Missing pieces are retried individually, and completed work is kept if a shared limit is reached. Engine credentials stay on the server.
          </p>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-2.5">
            <span className="truncate text-[11px] text-muted">{accountEmail || "Signed-in account"}</span>
            <button type="button" onClick={onSignOut} className="shrink-0 text-[11px] text-cream-soft underline-offset-4 hover:text-cream hover:underline">
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
