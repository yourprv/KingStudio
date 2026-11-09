"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { EngineConfig, Project } from "@/lib/types";
import {
  Chevron,
  Close,
  Database,
  Download,
  Gear,
  Plus,
  Search,
  Sparkle,
  Trash,
} from "./icons";

type Props = {
  projects: Project[];
  activeId: string | null;
  config: EngineConfig;
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onExport: () => void;
  onOpenSettings: () => void;
};

const subscribeMinute = (onChange: () => void) => {
  const timer = setInterval(onChange, 30_000);
  return () => clearInterval(timer);
};
const getMinute = () => Math.floor(Date.now() / 60_000);
const getServerMinute = () => 0;

const timeAgo = (iso: string, now: number) => {
  if (!now) return "recent";
  const diff = now - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
};

export default function Sidebar({
  projects,
  activeId,
  config,
  open,
  onClose,
  onSelect,
  onNew,
  onDelete,
  onExport,
  onOpenSettings,
}: Props) {
  const [query, setQuery] = useState("");
  const [historyOpen, setHistoryOpen] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);
  const minuteTick = useSyncExternalStore(subscribeMinute, getMinute, getServerMinute);
  const now = minuteTick * 60_000;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(q) ||
        project.prompt.toLowerCase().includes(q) ||
        project.stack.toLowerCase().includes(q),
    );
  }, [projects, query]);

  const groups = useMemo(() => {
    const today: Project[] = [];
    const earlier: Project[] = [];
    const dayAgo = now ? now - 24 * 60 * 60 * 1000 : Number.NEGATIVE_INFINITY;
    filtered.forEach((project) => {
      if (new Date(project.updatedAt).getTime() >= dayAgo) today.push(project);
      else earlier.push(project);
    });
    return [
      { label: "Today", items: today },
      { label: "Earlier", items: earlier },
    ].filter((group) => group.items.length > 0);
  }, [filtered, now]);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[264px] shrink-0 flex-col border-r border-line bg-shell transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 pb-4 pt-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-[11px] border border-line bg-panel-2 font-display text-[19px] text-gold">
              k
            </div>
            <div className="leading-tight">
              <p className="text-[13px] font-semibold tracking-tight text-cream">KITE</p>
              <p className="text-[9px] uppercase tracking-[0.18em] text-muted-dim">
                Personal workspace
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onClose}
              className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-panel-2 hover:text-cream lg:hidden"
              aria-label="Close sidebar"
            >
              <Close size={15} />
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="grid h-7 w-7 place-items-center rounded-md text-muted-dim transition hover:bg-panel-2 hover:text-cream"
              aria-label="Workspace settings"
            >
              <Gear size={15} />
            </button>
          </div>
        </div>

        <div className="px-3">
          <button
            type="button"
            onClick={onNew}
            className="flex w-full items-center gap-2.5 rounded-lg border border-line bg-panel/60 px-3 py-2 text-[13px] text-cream transition hover:border-line-strong hover:bg-panel-2"
          >
            <Plus size={15} className="text-gold" />
            New project
          </button>

          <div className="mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-muted transition focus-within:text-cream">
            <Search size={15} />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search projects"
              className="w-full bg-transparent text-[13px] text-cream placeholder:text-muted focus:outline-none"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
                <Close size={13} />
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onExport}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-muted transition hover:bg-panel-2 hover:text-cream"
          >
            <Download size={15} />
            Export workspace
          </button>

          <div className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-muted">
            <Sparkle size={15} />
            <span className="flex-1">Agent memory</span>
            <span className="rounded-full border border-line px-2 py-[3px] text-[8.5px] uppercase tracking-[0.14em] text-muted-dim">
              Local
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-b border-line px-5 pb-2">
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-dim">
            Projects
          </span>
          <button
            type="button"
            onClick={() => setHistoryOpen((current) => !current)}
            className="text-muted-dim transition hover:text-cream"
            aria-label="Toggle project list"
          >
            <Chevron
              size={13}
              className={`transition-transform ${historyOpen ? "" : "-rotate-90"}`}
            />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          {historyOpen ? (
            groups.length === 0 ? (
              <p className="px-3 py-6 text-[12px] leading-relaxed text-muted-dim">
                {projects.length === 0
                  ? "No projects yet. Describe a build and Kite will create the file tree."
                  : "No projects match that search."}
              </p>
            ) : (
              groups.map((group) => (
                <div key={group.label} className="mb-3">
                  <p className="px-3 pb-1 text-[9.5px] uppercase tracking-[0.16em] text-muted-dim">
                    {group.label}
                  </p>
                  <ul>
                    {group.items.map((project) => {
                      const active = project.id === activeId;
                      return (
                        <li key={project.id}>
                          <div
                            className={`group/item relative flex items-start gap-2 rounded-lg px-3 py-2 transition ${
                              active ? "bg-panel-2" : "hover:bg-panel/70"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => onSelect(project.id)}
                              className="min-w-0 flex-1 text-left"
                            >
                              <p
                                className={`truncate text-[12.5px] ${
                                  active ? "text-cream" : "text-cream-soft"
                                }`}
                              >
                                {project.name}
                              </p>
                              <p className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] text-muted-dim">
                                <span>{project.stack.toUpperCase()}</span>
                                <span className="h-[3px] w-[3px] rounded-full bg-muted-dim" />
                                <span>{project.fileCount} files</span>
                                <span className="h-[3px] w-[3px] rounded-full bg-muted-dim" />
                                <span>{timeAgo(project.updatedAt, now)}</span>
                              </p>
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onDelete(project.id);
                              }}
                              className="mt-0.5 hidden rounded p-1 text-muted-dim transition hover:text-ember group-hover/item:block"
                              aria-label={`Delete ${project.name}`}
                            >
                              <Trash size={13} />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )
          ) : null}
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className="m-3 flex items-center gap-2.5 rounded-xl border border-line bg-panel/60 px-3 py-2.5 text-left transition hover:border-line-strong"
        >
          <div className="grid h-8 w-8 place-items-center rounded-full border border-line bg-panel-3 font-display text-[14px] text-gold">
            k
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[12px] text-cream">
              {config.configured ? "Opal o1 flash connected" : "Local composer"}
            </p>
            <p className="flex items-center gap-1 truncate text-[9.5px] uppercase tracking-[0.12em] text-muted-dim">
              <Database size={9} />
              {config.storage.provider === "supabase" ? "Supabase storage" : "Postgres storage"}
            </p>
          </div>
          <Chevron size={13} className="-rotate-90 text-muted-dim" />
        </button>
      </aside>
    </>
  );
}
