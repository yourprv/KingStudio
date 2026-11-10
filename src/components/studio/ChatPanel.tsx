"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, EngineConfig, ProjectDetail } from "@/lib/types";
import Composer, { type ComposerMode } from "./Composer";
import { Check, Clock, FileIcon, Sparkle } from "./icons";
import { ENGINE_DISPLAY_NAME, LOCAL_ENGINE_DISPLAY_NAME } from "@/lib/engine-labels";

export type ThinkingState = {
  active: boolean;
  step: number;
  steps: string[];
  waiting?: { seconds: number; reason: string } | null;
};

type Props = {
  detail: ProjectDetail;
  busy: boolean;
  thinking: ThinkingState;
  rate: { used: number; limit: number; remaining: number } | null;
  config: EngineConfig;
  error: string | null;
  pendingPrompt: string | null;
  onSend: (prompt: string, mode: ComposerMode) => void;
  className?: string;
};

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("`") && part.endsWith("`") ? (
          <code
            key={index}
            className="rounded border border-line bg-panel-3 px-1 py-[1px] font-mono text-[11.5px] text-gold"
          >
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

function AgentBubble({ message }: { message: ChatMessage }) {
  const [planOpen, setPlanOpen] = useState(true);
  const files = message.meta?.files ?? [];
  const plan = message.meta?.plan ?? [];
  const note = [
    "Files mirrored to Supabase Storage",
    "Plan only — no files were written",
    "The connected model did not respond. Kite completed this run with its local composer.",
  ].includes(message.meta?.note ?? "")
    ? message.meta?.note
    : null;

  return (
    <div className="fade-up flex gap-2.5">
      <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border border-line bg-panel-2 font-display text-[12px] text-gold">
        k
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[11.5px] font-medium text-cream">Kite</span>
          <span className="text-[10px] text-muted-dim">
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div className="space-y-1.5 text-[13px] leading-relaxed text-cream-soft">
          {message.content.split("\n").map((line, index) =>
            line.trim() === "" ? (
              <div key={index} className="h-1" />
            ) : (
              <p key={index}>
                <InlineText text={line} />
              </p>
            ),
          )}
        </div>

        {plan.length > 0 ? (
          <div className="mt-3 rounded-xl border border-line bg-panel/60">
            <button
              type="button"
              onClick={() => setPlanOpen((current) => !current)}
              className="flex w-full items-center justify-between px-3 py-2 text-[10.5px] uppercase tracking-[0.14em] text-muted"
            >
              <span className="flex items-center gap-1.5">
                <Sparkle size={11} className="text-gold/80" />
                Plan · {plan.length} steps
              </span>
              <span className="text-[10px] normal-case tracking-normal text-muted-dim">
                {planOpen ? "Hide" : "Show"}
              </span>
            </button>
            {planOpen ? (
              <ul className="space-y-1.5 border-t border-line px-3 py-2.5">
                {plan.map((step, index) => (
                  <li key={index} className="flex items-start gap-2 text-[12px] text-muted">
                    <Check size={11} className="mt-[3px] shrink-0 text-gold/70" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {files.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {files.map((file) => (
              <span
                key={`${file.action}-${file.path}`}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10.5px] ${
                  file.action === "created"
                    ? "border-gold/30 bg-gold/10 text-gold"
                    : file.action === "updated"
                      ? "border-line bg-panel-2 text-cream-soft"
                      : "border-line bg-panel/60 text-muted-dim"
                }`}
              >
                <FileIcon size={10} />
                {file.path}
                <span className="text-[9px] uppercase tracking-[0.08em] opacity-70">
                  {file.action === "unchanged" ? "same" : file.action}
                </span>
              </span>
            ))}
          </div>
        ) : null}

        {(message.meta?.provider || message.meta?.durationMs) && (
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-dim">
            <Clock size={10} />
            <span>{message.meta?.provider === "local-engine" ? LOCAL_ENGINE_DISPLAY_NAME : ENGINE_DISPLAY_NAME}</span>
            {message.meta?.durationMs ? <span>· {(message.meta.durationMs / 1000).toFixed(1)}s</span> : null}
            {note ? <span>· {note}</span> : null}
          </p>
        )}
      </div>
    </div>
  );
}

function UserBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="fade-up flex justify-end">
      <div className="max-w-[88%] rounded-2xl rounded-br-md border border-line bg-panel-2 px-3.5 py-2.5 text-[13px] leading-relaxed text-cream">
        {message.content}
      </div>
    </div>
  );
}

function ThinkingCard({ thinking, config }: { thinking: ThinkingState; config: EngineConfig }) {
  if (!thinking.active) return null;
  const current = thinking.steps[Math.min(thinking.step, Math.max(0, thinking.steps.length - 1))] ?? "Thinking";

  return (
    <div className="fade-up flex gap-2.5">
      <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border border-gold/30 bg-gold/10 font-display text-[12px] text-gold">
        k
      </div>
      <div className="min-w-0 flex-1">
        <div className="rounded-xl border border-line bg-panel/70 p-3">
          <div className="flex items-center gap-2">
            <span className="flex gap-1">
              <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-gold" />
              <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-gold [animation-delay:0.18s]" />
              <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-gold [animation-delay:0.36s]" />
            </span>
            <span className="shimmer-text text-[12.5px] font-medium">
              {thinking.waiting ? "Holding for rate limit" : "Thinking"}
            </span>
            <span className="ml-auto font-mono text-[10px] text-muted-dim">
              {config.model}
            </span>
          </div>

          <p className="mt-2 text-[12px] text-cream-soft">
            {thinking.waiting ? thinking.waiting.reason : current}
            <span className="caret-blink ml-0.5 inline-block h-3 w-[5px] translate-y-[1px] bg-gold/80" />
          </p>

          <div className="relative mt-3 h-[3px] overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-gold/70 transition-all duration-700"
              style={{
                width: `${Math.min(
                  100,
                  ((thinking.step + 1) / Math.max(1, thinking.steps.length)) * 100,
                )}%`,
              }}
            />
          </div>

          {thinking.waiting ? (
            <p className="mt-2 flex items-center gap-1.5 text-[10.5px] text-muted">
              <Clock size={10} className="text-gold/70" />
              {thinking.waiting.seconds > 0
                ? `Retrying automatically in ${thinking.waiting.seconds}s — nothing was lost.`
                : "Retrying now…"}
            </p>
          ) : (
            <ul className="mt-2.5 grid gap-1">
              {thinking.steps.map((step, index) => (
                <li
                  key={step}
                  className={`flex items-center gap-1.5 text-[10.5px] transition ${
                    index === thinking.step
                      ? "text-cream-soft"
                      : index < thinking.step
                        ? "text-muted"
                        : "text-muted-dim/60"
                  }`}
                >
                  {index < thinking.step ? (
                    <Check size={10} className="text-gold/70" />
                  ) : index === thinking.step ? (
                    <span className="thinking-dot h-1 w-1 rounded-full bg-gold" />
                  ) : (
                    <span className="h-1 w-1 rounded-full bg-muted-dim/40" />
                  )}
                  {step}
                </li>
              ))}
            </ul>
          )}

          {!config.configured ? (
            <p className="mt-2.5 border-t border-line pt-2 text-[10px] leading-relaxed text-muted-dim">
              Opal o1 flash is unavailable, so Kite&apos;s local composer is handling this run.
              The workspace will switch back automatically when the engine is ready.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function ChatPanel({
  detail,
  busy,
  thinking,
  rate,
  config,
  error,
  pendingPrompt,
  onSend,
  className,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => detail.messages, [detail.messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, thinking.active, thinking.step, error, busy]);

  return (
    <div className={`min-h-0 flex-col border-line bg-shell/40 ${className ?? ""}`}>
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted">
          <Sparkle size={12} className="text-gold/80" />
          Agent thread
        </div>
        <span className="font-mono text-[10px] text-muted-dim">
          {messages.length} msg{messages.length === 1 ? "" : "s"}
        </span>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="rounded-xl border border-line bg-panel/50 p-3.5 text-[12.5px] leading-relaxed text-muted">
            This project has no commands yet. Ask Kite to add a page, a section or another
            file — or describe a whole new build.
          </div>
        ) : (
          messages.map((message) =>
            message.role === "user" ? (
              <UserBubble key={message.id} message={message} />
            ) : (
              <AgentBubble key={message.id} message={message} />
            ),
          )
        )}

        {pendingPrompt && busy && !thinking.waiting ? (
          <div className="fade-up flex justify-end">
            <div className="max-w-[88%] rounded-2xl rounded-br-md border border-line bg-panel-2 px-3.5 py-2.5 text-[13px] leading-relaxed text-cream">
              {pendingPrompt}
            </div>
          </div>
        ) : null}

        <ThinkingCard thinking={thinking} config={config} />

        {error ? (
          <div className="fade-up rounded-xl border border-ember/40 bg-ember/10 px-3 py-2.5 text-[12px] text-[#f0b7a2]">
            {error}
          </div>
        ) : null}
      </div>

      <div className="border-t border-line bg-shell/80 px-3 pb-4 pt-3">
        {detail.files.length > 0 ? (
          <p className="mb-2 px-1 text-[10px] leading-relaxed text-muted-dim">
            Project context is attached. Paste a README or terminal error here and Kite can use this project’s brief and saved files to fix it.
          </p>
        ) : null}
        <Composer
          onSubmit={onSend}
          busy={busy}
          rate={rate}
          placeholder={
            detail.files.length
              ? "Ask for a change — “add a contact section”, “make it dark”…"
              : "Describe what Kite should build…"
          }
        />
      </div>
    </div>
  );
}
