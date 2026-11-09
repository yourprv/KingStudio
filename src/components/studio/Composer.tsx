"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Chevron, Plus } from "./icons";

export type ComposerMode = "build" | "plan";

type Props = {
  onSubmit: (prompt: string, mode: ComposerMode) => void;
  busy?: boolean;
  placeholder?: string;
  rate?: { used: number; limit: number; remaining: number } | null;
  hint?: string;
  autoFocus?: boolean;
  large?: boolean;
};

export default function Composer({
  onSubmit,
  busy = false,
  placeholder = "How can I help you today?",
  rate,
  hint,
  autoFocus,
  large,
}: Props) {
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<ComposerMode>("build");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, large ? 200 : 140)}px`;
  }, [value, large]);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  function submit() {
    const prompt = value.trim();
    if (!prompt || busy) return;
    onSubmit(prompt, mode);
    setValue("");
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    const snippet = `\n\n--- ${file.name} ---\n${text.slice(0, 4000)}`;
    setValue((current) => (current + snippet).trimStart());
    textareaRef.current?.focus();
  }

  const remaining = rate ? Math.max(0, rate.remaining) : null;
  const pct = rate && rate.limit > 0 ? Math.min(100, (rate.used / rate.limit) * 100) : 0;

  return (
    <div className="w-full">
      <div
        className={`group relative rounded-[24px] border border-line bg-panel/90 px-4 pb-3 pt-4 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur transition-colors focus-within:border-line-strong ${
          large ? "sm:px-5 sm:pb-4 sm:pt-5" : ""
        }`}
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title="Add a file as context"
            className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-muted transition hover:border-line-strong hover:text-cream"
          >
            <Plus size={15} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.html,.css,.js,.json,.py,.ts,.jsx,.tsx"
            className="hidden"
            onChange={(event) => {
              void importFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            autoFocus={autoFocus}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder={placeholder}
            className={`min-h-[28px] flex-1 resize-none bg-transparent text-[15px] leading-7 text-cream placeholder:text-muted/80 focus:outline-none ${
              large ? "sm:text-base" : ""
            }`}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pl-0 sm:pl-11">
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as ComposerMode)}
                aria-label="Agent mode"
                className="appearance-none rounded-full border border-line bg-panel-2 py-1.5 pl-3 pr-7 text-[11.5px] tracking-wide text-cream-soft focus:outline-none"
              >
                <option value="build">Build</option>
                <option value="plan">Plan first</option>
              </select>
              <Chevron
                size={12}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted"
              />
            </div>
            <span className="hidden items-center gap-1.5 text-[11px] text-muted-dim sm:flex">
              <span className="h-1 w-1 rounded-full bg-gold/70" />
              Enter to send · Shift+Enter for a new line
            </span>
          </div>

          <div className="flex items-center gap-3">
            {rate ? (
              <div className="hidden items-center gap-2 sm:flex" title={`${rate.used} of ${rate.limit} agent runs used this minute`}>
                <div className="h-1 w-16 overflow-hidden rounded-full bg-line">
                  <div
                    className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-ember" : "bg-gold/70"}`}
                    style={{ width: `${Math.max(4, pct)}%` }}
                  />
                </div>
                <span className="text-[10.5px] tabular-nums text-muted-dim">
                  {remaining}/{rate.limit} runs
                </span>
              </div>
            ) : null}
            <button
              type="button"
              onClick={submit}
              disabled={busy || value.trim().length === 0}
              aria-label="Send to agent"
              className="grid h-9 w-9 place-items-center rounded-full bg-cream text-void transition hover:bg-white disabled:cursor-not-allowed disabled:bg-panel-2 disabled:text-muted-dim"
            >
              {busy ? (
                <span className="flex gap-0.5">
                  <span className="thinking-dot h-1 w-1 rounded-full bg-current" />
                  <span className="thinking-dot h-1 w-1 rounded-full bg-current [animation-delay:0.15s]" />
                  <span className="thinking-dot h-1 w-1 rounded-full bg-current [animation-delay:0.3s]" />
                </span>
              ) : (
                <ArrowUp size={16} />
              )}
            </button>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-muted-dim">
        {hint ?? "Kite writes real files. Review generated code before you deploy it."}
      </p>
    </div>
  );
}
