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
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#0c0b0d]">
      <div className="home-aurora pointer-events-none absolute inset-x-0 top-0 h-[520px]" />

      <div className="relative mx-auto flex w-full max-w-[1080px] flex-1 flex-col px-5 pb-8 pt-14 sm:px-8 sm:pt-[7vh]">
        <div className="fade-up mx-auto w-full max-w-[780px] text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-white/70 backdrop-blur">
            <Sparkle size={12} className="text-[#d5bcff]" />
            Your AI workspace
          </div>

          <h1 className="text-[clamp(38px,6.8vw,68px)] font-medium leading-[1.04] tracking-[-0.05em] text-white">
            Let’s build something
            <br />
            <span className="home-title-gradient">worth sharing.</span>
          </h1>

          <p className="mx-auto mt-4 max-w-[49ch] text-[14px] leading-relaxed text-white/65">
            Start with a sentence. Kite will shape the project, write the files, and help you run it in the browser.
          </p>

          <div className="fade-up mt-7 text-left" style={{ animationDelay: "80ms" }}>
            <Composer
              onSubmit={onSend}
              busy={busy}
              rate={rate}
              large
              autoFocus
              placeholder="Describe the app, site, or tool you want to make…"
              hint="Build a visual project or a Node app with a live npm terminal."
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.title}
                  type="button"
                  disabled={busy}
                  onClick={() => onSend(card.prompt, "build")}
                  className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3.5 py-2 text-[11.5px] text-white/80 backdrop-blur transition hover:border-[#c7aaff]/40 hover:bg-[#a98bff]/15 hover:text-white disabled:opacity-50"
                >
                  <Icon size={13} className="text-[#d5bcff]" />
                  {card.title}
                  <ArrowUpRight size={12} className="text-white/40 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white" />
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10.5px] text-white/45">
            {CHIPS.slice(0, 3).map((chip) => (
              <button key={chip} type="button" disabled={busy} onClick={() => onSend(chip, "build")} className="transition hover:text-white/80 disabled:opacity-50">
                {chip}
              </button>
            ))}
          </div>
        </div>

        <section className="mt-auto pt-12 sm:pt-16">
          <div className="rounded-[24px] border border-white/[0.08] bg-[#111012]/95 p-4 shadow-[0_24px_70px_-35px_rgba(0,0,0,0.9)] sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-white">My projects</span>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] text-white/45">{projects.length}</span>
              </div>
              <span className="text-[10px] text-white/40">Recently updated</span>
            </div>

            {projects.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {projects.slice(0, 3).map((project, index) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => onSelect(project.id)}
                    className="group overflow-hidden rounded-xl border border-white/[0.08] bg-[#171619] text-left transition hover:-translate-y-0.5 hover:border-[#c7aaff]/30"
                  >
                    <span className={`flex h-[82px] items-center justify-center ${index === 0 ? "bg-[radial-gradient(ellipse_at_50%_120%,rgba(255,59,166,.38),rgba(54,93,255,.25)_52%,#171619_82%)]" : index === 1 ? "bg-[radial-gradient(ellipse_at_30%_120%,rgba(94,137,255,.38),transparent_70%),#171619]" : "bg-[radial-gradient(ellipse_at_70%_120%,rgba(196,116,255,.3),transparent_70%),#171619]"}`}>
                      <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-black/25 text-white/70 backdrop-blur">
                        <Code size={15} />
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-2 px-3.5 py-3">
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-medium text-white/90">{project.name}</span>
                        <span className="mt-1 block text-[10px] text-white/40">{project.fileCount} files · {project.stack.toUpperCase()}</span>
                      </span>
                      <ArrowUpRight size={13} className="shrink-0 text-white/35 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-center text-[11px] text-white/40">
                Your recent projects will appear here.
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] text-white/35 sm:justify-between">
            <span className="inline-flex items-center gap-1.5"><FileIcon size={12} /> {projects.length} projects · {totalFiles} files</span>
            <span className="inline-flex items-center gap-1.5"><Code size={12} /> Editable files · live preview</span>
            <span className="inline-flex items-center gap-1.5"><Clock size={12} /> {config.configured ? config.model : "Kite local composer"}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
