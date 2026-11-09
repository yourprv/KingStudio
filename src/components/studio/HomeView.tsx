"use client";

import type { EngineConfig, Project } from "@/lib/types";
import Composer, { type ComposerMode } from "./Composer";
import { ArrowUpRight, Clock, Code, FileIcon, Pencil, Sliders, Sparkle } from "./icons";

type Props = {
  onSend: (prompt: string, mode: ComposerMode) => void;
  onSelect: (id: string) => void;
  busy: boolean;
  rate: { used: number; limit: number; remaining: number } | null;
  config: EngineConfig;
  projects: Project[];
};

const CARDS = [
  {
    icon: Pencil,
    title: "Write a portfolio",
    description: "An editorial one-pager in HTML, CSS and JS.",
    prompt: "Build me a portfolio for Aria Chen, a product designer",
  },
  {
    icon: Sparkle,
    title: "Ship a landing page",
    description: "Hero, features and pricing, ready to deploy.",
    prompt: "Create a SaaS landing page for an AI analytics startup",
  },
  {
    icon: Sliders,
    title: "Build a small app",
    description: "A working task app with saved state.",
    prompt: "Build a task app with filters and local storage",
  },
];

const CHIPS = [
  "An analytics dashboard with a chart",
  "A Python CLI task tracker",
  "A Node/Express notes API",
  "A photographer portfolio",
  "A restaurant landing page",
];

export default function HomeView({ onSend, onSelect, busy, rate, config, projects }: Props) {
  const totalFiles = projects.reduce((sum, project) => sum + project.fileCount, 0);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="grid-fade pointer-events-none absolute inset-x-0 top-0 h-[420px]" />

      <div className="relative mx-auto flex w-full max-w-[880px] flex-1 flex-col justify-center px-5 pb-10 pt-10 sm:px-8 sm:pt-14">
        <div className="fade-up text-center">
          <div className="mb-7 flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.24em] text-muted">
            <span className="h-px w-8 bg-line-strong" />
            Kite · your workspace
            <span className="h-px w-8 bg-line-strong" />
          </div>

          <h1 className="text-[clamp(36px,7vw,66px)] font-medium leading-[1.02] tracking-[-0.045em] text-cream">
            Describe it once.
            <br />
            <span className="serif-accent text-[clamp(38px,7.6vw,72px)] leading-[1.05]">
              watch it become files.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-[46ch] text-[14.5px] leading-relaxed text-muted">
            Bring a rough idea or a blank page. Kite plans the folder tree, writes each
            file separately, and keeps it all editable in your browser.
          </p>
        </div>

        <div className="fade-up mt-9 grid gap-3 sm:grid-cols-3" style={{ animationDelay: "80ms" }}>
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.title}
                type="button"
                disabled={busy}
                onClick={() => onSend(card.prompt, "build")}
                className="group relative flex h-full flex-col rounded-2xl border border-line bg-panel/70 p-4 text-left transition hover:-translate-y-0.5 hover:border-line-strong hover:bg-panel-2 disabled:opacity-50"
              >
                <span className="mb-6 grid h-8 w-8 place-items-center rounded-lg border border-line bg-panel-2 text-cream-soft transition group-hover:text-gold">
                  <Icon size={15} />
                </span>
                <span className="text-[13.5px] font-medium text-cream">{card.title}</span>
                <span className="mt-1.5 text-[12px] leading-relaxed text-muted">
                  {card.description}
                </span>
                <span className="mt-5 flex items-center justify-between text-muted-dim">
                  <span className="text-[9.5px] uppercase tracking-[0.16em]">HTML · CSS · JS</span>
                  <ArrowUpRight
                    size={14}
                    className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gold"
                  />
                </span>
              </button>
            );
          })}
        </div>

        <div className="fade-up mt-8" style={{ animationDelay: "140ms" }}>
          <Composer onSubmit={onSend} busy={busy} rate={rate} large autoFocus />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={busy}
              onClick={() => onSend(chip, "build")}
              className="rounded-full border border-line px-3 py-1.5 text-[11.5px] text-muted transition hover:border-line-strong hover:text-cream disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>

        <div className="mt-10 grid gap-3 border-t border-line pt-5 text-[11px] text-muted-dim sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <Code size={13} className="text-gold/70" />
            <span>Separate files, real folders</span>
          </div>
          <div className="flex items-center gap-2">
            <FileIcon size={13} className="text-gold/70" />
            <span>
              {projects.length} project{projects.length === 1 ? "" : "s"} · {totalFiles} files
            </span>
          </div>
          <div className="flex items-center gap-2 sm:justify-end">
            <Clock size={13} className="text-gold/70" />
            <span>
              {config.configured ? config.model : "Kite local composer"}
            </span>
          </div>
        </div>

        {projects.length > 0 ? (
          <div className="mt-7">
            <p className="mb-2 text-[9.5px] uppercase tracking-[0.18em] text-muted-dim">
              Continue where you left off
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {projects.slice(0, 3).map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => onSelect(project.id)}
                  className="flex items-center justify-between gap-2 rounded-xl border border-line bg-panel/50 px-3 py-2.5 text-left transition hover:border-line-strong hover:bg-panel-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] text-cream-soft">{project.name}</span>
                    <span className="block text-[10px] text-muted-dim">
                      {project.fileCount} files · {project.stack.toUpperCase()}
                    </span>
                  </span>
                  <ArrowUpRight size={13} className="shrink-0 text-muted-dim" />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
