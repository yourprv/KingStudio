"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChatMessage, CreditSnapshot, EngineConfig, Project, ProjectDetail, QuotaSnapshot, RateSnapshot, WorkspaceFile } from "@/lib/types";
import { apiFetch, getSupabaseBrowserClient } from "@/lib/supabase/client";
import { buildPreviewDocument } from "@/lib/preview";
import ChatPanel, { type ThinkingState } from "./ChatPanel";
import CodePane from "./CodePane";
import type { ComposerMode } from "./Composer";
import FileTree from "./FileTree";
import HomeView from "./HomeView";
import SettingsDialog from "./SettingsDialog";
import Sidebar from "./Sidebar";
import {
  ArrowLeft,
  Chevron,
  Download,
  Flame,
  Gear,
  PanelLeft,
  Plus,
  Sparkle,
} from "./icons";

type Rate = RateSnapshot;
type RunResponse = { detail: ProjectDetail; rate?: Rate; quota?: QuotaSnapshot; credits?: CreditSnapshot; provider?: string; note?: string };
type RunResult = { ok: true; data: RunResponse } | { ok: false; error: string };

const THINKING_STEPS = [
  "Reading the brief and extracting intent",
  "Choosing a stack and folder structure",
  "Planning file-level changes",
  "Writing file contents",
  "Linking styles, scripts and assets",
  "Saving to the workspace",
];

const pickEntryFile = (files: WorkspaceFile[]) =>
  files.find((file) => file.kind === "file" && file.path.endsWith("index.html")) ??
  files.find((file) => file.kind === "file" && file.path.endsWith(".html")) ??
  files.find((file) => file.kind === "file") ??
  null;

export default function Studio({
  initialProjects,
  initialConfig,
  initialRate,
}: {
  initialProjects: Project[];
  initialConfig: EngineConfig;
  initialRate: Rate | null;
}) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [mode, setMode] = useState<"code" | "preview">("code");
  const [mobilePane, setMobilePane] = useState<"chat" | "code">("code");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingProject, setLoadingProject] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [rate, setRate] = useState<Rate | null>(initialRate);
  const [config, setConfig] = useState<EngineConfig>(initialConfig);
  const [credits, setCredits] = useState<CreditSnapshot>({
    granted: 1_000_000,
    balance: 1_000_000,
    used: 0,
    requestsUsed: 0,
    requestCost: 2_000,
  });
  const [quota, setQuota] = useState<QuotaSnapshot | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const [thinking, setThinking] = useState<ThinkingState>({
    active: false,
    step: 0,
    steps: THINKING_STEPS,
    waiting: null,
  });

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => {
      setThinking((current) =>
        current.waiting
          ? current
          : { ...current, step: Math.min(current.step + 1, current.steps.length - 1) },
      );
    }, 1500);
    return () => clearInterval(timer);
  }, [busy]);

  const activeFile = useMemo(
    () => detail?.files.find((file) => file.id === activeFileId) ?? null,
    [detail, activeFileId],
  );

  const previewDoc = useMemo(
    () => (detail ? buildPreviewDocument(detail.files) : null),
    [detail],
  );

  const refreshProjects = useCallback(async () => {
    try {
      const res = await apiFetch("/api/projects", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { projects: Project[]; rate?: Rate; quota?: QuotaSnapshot; credits?: CreditSnapshot; config?: EngineConfig; user?: { email?: string } };
      setProjects(data.projects);
      if (data.rate) setRate(data.rate);
      if (data.quota) setQuota(data.quota);
      if (data.credits) setCredits(data.credits);
      if (data.config) setConfig(data.config);
      setAccountEmail(data.user?.email ?? "");
    } catch {
      // Sidebar refresh is best-effort.
    }
  }, []);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  const loadProject = useCallback(async (id: string) => {
    setLoadingProject(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/projects/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load that project.");
      const data = (await res.json()) as { detail: ProjectDetail };
      setDetail(data.detail);
      setActiveId(id);
      const entry = pickEntryFile(data.detail.files);
      setActiveFileId(entry?.id ?? null);
      setMobilePane("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load project.");
    } finally {
      setLoadingProject(false);
      setSidebarOpen(false);
    }
  }, []);

  const hold = useCallback(async (ms: number, reason: string) => {
    const end = Date.now() + ms;
    setThinking((current) => ({
      ...current,
      active: true,
      waiting: { seconds: Math.ceil(ms / 1000), reason },
    }));
    while (Date.now() < end) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      setThinking((current) => ({
        ...current,
        waiting: {
          seconds: Math.max(0, Math.ceil((end - Date.now()) / 1000)),
          reason,
        },
      }));
    }
    setThinking((current) => ({ ...current, waiting: null }));
  }, []);

  const runRequest = useCallback(
    async (url: string, body: Record<string, unknown>): Promise<RunResult> => {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
          const res = await apiFetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = (await res.json().catch(() => ({}))) as RunResponse & {
            error?: string;
            retryAfterMs?: number;
            message?: string;
            rate?: Rate;
            quota?: QuotaSnapshot;
            credits?: CreditSnapshot;
          };
          if (data.rate) setRate(data.rate);
          if (data.quota) setQuota(data.quota);
          if (data.credits) setCredits(data.credits);

          if (res.status === 429) {
            if (data.error === "daily_quota") {
              return { ok: false, error: data.message ?? "The shared daily request allowance has been reached." };
            }
            const waitMs = Math.max(1500, Number(data.retryAfterMs ?? 15000));
            await hold(
              waitMs,
              `${data.message ?? "Per-minute limit reached."} ${
                data.rate ? `${data.rate.remaining}/${data.rate.limit} runs available.` : ""
              }`.trim(),
            );
            continue;
          }

          if (!res.ok) return { ok: false, error: data.message ?? data.error ?? "The agent run failed." };
          return { ok: true, data };
        } catch {
          return { ok: false, error: "Network hiccup — the request never reached the agent." };
        }
      }
      return {
        ok: false,
        error: "Still rate limited. Wait a few seconds, then send the command again.",
      };
    },
    [hold],
  );

  const handleSend = useCallback(
    async (prompt: string, sendMode: ComposerMode) => {
      if (busy) return;
      setError(null);
      setBusy(true);
      setPendingPrompt(prompt);
      setThinking({ active: true, step: 0, steps: THINKING_STEPS, waiting: null });

      try {
        if (!activeId) {
          const result = await runRequest("/api/projects", { prompt, planOnly: sendMode === "plan" });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          const next = result.data.detail;
          setDetail(next);
          setActiveId(next.project.id);
          setActiveFileId(pickEntryFile(next.files)?.id ?? null);
          setProjects((current) => [next.project, ...current.filter((p) => p.id !== next.project.id)]);
          setMobilePane("code");
          setToast(
            next.files.length
              ? `${next.files.length} files written to the workspace`
              : "Plan ready — switch to Build when you're happy with it",
          );
        } else {
          const optimistic: ChatMessage = {
            id: `optimistic-${Date.now()}`,
            role: "user",
            content: prompt,
            kind: "text",
            meta: null,
            createdAt: new Date().toISOString(),
          };
          setDetail((current) =>
            current ? { ...current, messages: [...current.messages, optimistic] } : current,
          );

          const result = await runRequest(`/api/projects/${activeId}/generate`, {
            prompt,
            planOnly: sendMode === "plan",
          });

          if (!result.ok) {
            setError(result.error);
            await loadProject(activeId);
            return;
          }

          const next = result.data.detail;
          setDetail(next);
          setActiveFileId((current) => {
            if (current && next.files.some((file) => file.id === current)) return current;
            return pickEntryFile(next.files)?.id ?? null;
          });
          void refreshProjects();
          setToast("Workspace updated");
        }
      } finally {
        setBusy(false);
        setPendingPrompt(null);
        setThinking((current) => ({ ...current, active: false, waiting: null }));
      }
    },
    [activeId, busy, loadProject, refreshProjects, runRequest],
  );

  const handleNewProject = useCallback(() => {
    setActiveId(null);
    setDetail(null);
    setActiveFileId(null);
    setError(null);
    setMode("code");
    setSidebarOpen(false);
    setMobilePane("chat");
  }, []);

  const handleDeleteProject = useCallback(
    async (id: string) => {
      const target = projects.find((project) => project.id === id);
      if (!window.confirm(`Delete “${target?.name ?? "this project"}” and its files?`)) return;
      const res = await apiFetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setToast("Could not delete that project");
        return;
      }
      setProjects((current) => current.filter((project) => project.id !== id));
      if (activeId === id) handleNewProject();
      setToast("Project deleted");
    },
    [activeId, handleNewProject, projects],
  );

  const createFile = useCallback(
    async (path: string, kind: "file" | "folder") => {
      if (!activeId) return;
      const seed =
        kind === "file"
          ? `${
              path.endsWith(".md")
                ? "# "
                : path.endsWith(".html")
                  ? "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\" />\n  <title>New page</title>\n</head>\n<body>\n  <h1>New page</h1>\n</body>\n</html>\n"
                  : path.endsWith(".css")
                    ? "/* new stylesheet */\n"
                    : path.endsWith(".js")
                      ? "// new script\n"
                      : ""
            }`
          : "";
      const res = await apiFetch(`/api/projects/${activeId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, kind, content: seed }),
      });
      const data = (await res.json().catch(() => ({}))) as { file?: WorkspaceFile; error?: string };
      if (!res.ok || !data.file) {
        setToast(data.error ?? "Could not create that file");
        return;
      }
      await loadProject(activeId);
      if (kind === "file") setActiveFileId(data.file.id);
      setToast(kind === "folder" ? `Folder “${path}” created` : `${path} created`);
      void refreshProjects();
    },
    [activeId, loadProject, refreshProjects],
  );

  const saveFile = useCallback(
    async (file: WorkspaceFile, content: string) => {
      if (!activeId) return;
      const res = await apiFetch(`/api/projects/${activeId}/files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = (await res.json().catch(() => ({}))) as { file?: WorkspaceFile; error?: string };
      if (!res.ok || !data.file) {
        setToast(data.error ?? "Could not save that file");
        return;
      }
      const saved = data.file;
      setDetail((current) =>
        current
          ? {
              ...current,
              files: current.files.map((item) => (item.id === saved.id ? saved : item)),
            }
          : current,
      );
      setToast(`${saved.path} saved`);
    },
    [activeId],
  );

  const deleteFile = useCallback(
    async (file: WorkspaceFile) => {
      if (!activeId) return;
      if (!window.confirm(`Delete ${file.path}?`)) return;
      const res = await apiFetch(`/api/projects/${activeId}/files/${file.id}`, { method: "DELETE" });
      if (!res.ok) {
        setToast("Could not delete that file");
        return;
      }
      setDetail((current) =>
        current
          ? {
              ...current,
              files: current.files.filter((item) => item.id !== file.id),
              project: { ...current.project, fileCount: Math.max(0, current.project.fileCount - 1) },
            }
          : current,
      );
      if (activeFileId === file.id) {
        const next = detail?.files.find((item) => item.id !== file.id && item.kind === "file");
        setActiveFileId(next?.id ?? null);
      }
      setToast(`${file.path} deleted`);
      void refreshProjects();
    },
    [activeFileId, activeId, detail, refreshProjects],
  );

  const downloadZip = useCallback(async () => {
    if (!detail) return;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    detail.files.forEach((file) => {
      if (file.kind === "folder") zip.folder(file.path);
    });
    detail.files
      .filter((file) => file.kind === "file")
      .forEach((file) => zip.file(file.path, file.content));
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${detail.project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.zip`;
    link.click();
    URL.revokeObjectURL(url);
    setToast("Project downloaded as .zip");
  }, [detail]);

  const exportWorkspace = useCallback(async () => {
    const payload = [];
    for (const project of projects) {
      const res = await apiFetch(`/api/projects/${project.id}`, { cache: "no-store" });
      if (!res.ok) continue;
      const data = (await res.json()) as { detail: ProjectDetail };
      payload.push(data.detail);
    }
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), projects: payload }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kite-workspace.json";
    link.click();
    URL.revokeObjectURL(url);
    setToast("Workspace exported");
  }, [projects]);

  const storageLabel =
    config.storage.provider === "supabase"
      ? `Supabase · ${config.storage.bucket}/${detail?.project.id.slice(0, 8) ?? "…"}`
      : `Postgres files · local workspace`;

  const signOut = useCallback(async () => {
    await getSupabaseBrowserClient()?.auth.signOut();
  }, []);

  return (
    <div className="flex h-dvh overflow-hidden bg-void">
      <Sidebar
        projects={projects}
        activeId={activeId}
        config={config}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelect={(id) => void loadProject(id)}
        onNew={handleNewProject}
        onDelete={(id) => void handleDeleteProject(id)}
        onExport={() => void exportWorkspace()}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[58px] shrink-0 items-center gap-3 border-b border-line px-3 sm:px-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line text-muted lg:hidden"
            aria-label="Open sidebar"
          >
            <PanelLeft size={15} />
          </button>

          {activeId ? (
            <button
              type="button"
              onClick={handleNewProject}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-panel-2 hover:text-cream"
              aria-label="Back to workspace home"
            >
              <ArrowLeft size={16} />
            </button>
          ) : null}

          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-line bg-panel-2 text-gold">
              <Flame size={12} />
            </span>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex min-w-0 items-center gap-1.5 text-left"
            >
              <span className="truncate text-[13px] font-medium tracking-tight text-cream">
                {detail ? detail.project.name : "KITE V1 · Studio"}
              </span>
              <Chevron size={13} className="shrink-0 text-muted" />
            </button>
            {detail ? (
              <span className="hidden items-center gap-1.5 rounded-full border border-line px-2 py-[2px] text-[9px] uppercase tracking-[0.12em] text-muted sm:flex">
                <span className="h-1 w-1 rounded-full bg-[#a8c69a]" />
                {detail.project.stack}
              </span>
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button type="button" onClick={() => setSettingsOpen(true)} className="hidden rounded-full border border-gold/25 bg-gold/5 px-2.5 py-1 font-mono text-[10px] text-gold sm:inline-flex">
              {credits.balance.toLocaleString()} credits
            </button>
            <button type="button" onClick={() => void signOut()} className="hidden max-w-[150px] truncate text-[10px] text-muted hover:text-cream md:block" title={accountEmail}>
              {accountEmail || "Account"} · Sign out
            </button>
            <span className="mx-1 hidden h-4 w-px bg-line sm:block" />
            <span className="hidden items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[10px] text-muted md:flex">
              <Sparkle size={11} className="text-gold/80" />
              {config.configured ? config.model : "Local composer"}
            </span>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-panel-2 hover:text-cream"
              aria-label="Settings"
            >
              <Gear size={16} />
            </button>
            <button
              type="button"
              onClick={handleNewProject}
              className="flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[11.5px] text-cream-soft transition hover:border-line-strong hover:text-cream"
            >
              <Plus size={12} />
              <span className="hidden sm:inline">New</span>
            </button>
          </div>
        </header>

        {activeId && detail ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-line bg-shell/50 px-3 py-1.5">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-dim">
                <span>{detail.files.filter((file) => file.kind === "file").length} files</span>
                <span className="h-1 w-1 rounded-full bg-line-strong" />
                <span className="hidden sm:inline">Prompt: {detail.project.prompt.slice(0, 54)}</span>
                <span className="sm:hidden">Updated just now</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex rounded-md border border-line p-0.5 lg:hidden">
                  <button
                    type="button"
                    onClick={() => setMobilePane("chat")}
                    className={`rounded px-2 py-1 text-[10.5px] ${
                      mobilePane === "chat" ? "bg-panel-3 text-cream" : "text-muted"
                    }`}
                  >
                    Agent
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobilePane("code")}
                    className={`rounded px-2 py-1 text-[10.5px] ${
                      mobilePane === "code" ? "bg-panel-3 text-cream" : "text-muted"
                    }`}
                  >
                    Files
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => void downloadZip()}
                  className="flex items-center gap-1 rounded border border-line px-2 py-1 text-[10.5px] text-muted transition hover:text-cream"
                >
                  <Download size={11} />
                  <span className="hidden sm:inline">Download .zip</span>
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1">
              <ChatPanel
                detail={detail}
                busy={busy}
                thinking={thinking}
                rate={rate}
                config={config}
                error={error}
                pendingPrompt={pendingPrompt}
                onSend={(prompt, sendMode) => void handleSend(prompt, sendMode)}
                className={`w-full shrink-0 border-r lg:w-[380px] xl:w-[410px] ${
                  mobilePane === "chat" ? "flex" : "hidden"
                } lg:flex`}
              />

              <div
                className={`min-w-0 flex-1 ${
                  mobilePane === "code" ? "flex" : "hidden"
                } lg:flex`}
              >
                <div className="hidden w-[206px] shrink-0 border-r border-line md:flex">
                  <FileTree
                    files={detail.files}
                    activeId={activeFileId}
                    storageLabel={storageLabel}
                    onSelect={(file) => {
                      setActiveFileId(file.id);
                      setMode("code");
                    }}
                    onCreate={(path, kind) => void createFile(path, kind)}
                    onDelete={(file) => void deleteFile(file)}
                    onDownloadAll={() => void downloadZip()}
                  />
                </div>
                <CodePane
                  files={detail.files}
                  activeFile={activeFile}
                  mode={mode}
                  previewDoc={previewDoc}
                  onMode={setMode}
                  onSelectId={(id) => {
                    setActiveFileId(id);
                    setMode("code");
                  }}
                  onSave={(file, content) => saveFile(file, content)}
                  onDelete={(file) => void deleteFile(file)}
                  onCreate={() => {
                    const name = window.prompt("New file path (folders allowed)", "page.html");
                    if (name) void createFile(name, "file");
                  }}
                />
              </div>
            </div>
          </div>
        ) : loadingProject ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="shimmer-text text-[13px]">Opening project…</p>
          </div>
        ) : busy ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6">
            <div className="w-full max-w-[560px] rounded-2xl border border-line bg-panel/70 p-5">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-md border border-gold/30 bg-gold/10 font-display text-[13px] text-gold">
                  k
                </span>
                <span className="shimmer-text text-[13px] font-medium">Kite is building your project</span>
                <span className="ml-auto font-mono text-[10px] text-muted-dim">{config.model}</span>
              </div>
              <p className="mt-3 rounded-lg border border-line bg-panel-2 px-3 py-2 text-[12px] text-cream-soft">
                {pendingPrompt}
              </p>
              <ul className="mt-3 grid gap-1.5">
                {thinking.steps.map((step, index) => (
                  <li
                    key={step}
                    className={`flex items-center gap-2 text-[11.5px] ${
                      index === thinking.step
                        ? "text-cream-soft"
                        : index < thinking.step
                          ? "text-muted"
                          : "text-muted-dim/60"
                    }`}
                  >
                    <span
                      className={`h-1 w-1 rounded-full ${
                        index <= thinking.step ? "bg-gold thinking-dot" : "bg-muted-dim/40"
                      }`}
                    />
                    {step}
                  </li>
                ))}
              </ul>
              {thinking.waiting ? (
                <p className="mt-3 border-t border-line pt-2.5 text-[11px] text-muted">
                  {thinking.waiting.reason} Retrying in {thinking.waiting.seconds}s.
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="mt-4 text-[11.5px] text-muted underline-offset-4 hover:text-cream hover:underline"
            >
              Browse existing projects while this runs
            </button>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            {error ? (
              <div className="fade-up mx-auto mt-4 flex w-[min(92%,640px)] items-start gap-2 rounded-xl border border-ember/40 bg-[#1b1210] px-3 py-2 text-[11.5px] text-[#f0b7a2]">
                <span className="flex-1">{error}</span>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-muted transition hover:text-cream"
                >
                  dismiss
                </button>
              </div>
            ) : null}
            <HomeView
              onSend={(prompt, sendMode) => void handleSend(prompt, sendMode)}
              onSelect={(id) => void loadProject(id)}
              busy={busy}
              rate={rate}
              config={config}
              projects={projects}
            />
          </div>
        )}
      </main>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={config}
        rate={rate}
        credits={credits}
        quota={quota}
        accountEmail={accountEmail}
        onSignOut={() => void signOut()}
      />

      {toast ? (
        <div className="fade-up fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-line bg-panel-2/95 px-4 py-2 text-[11.5px] text-cream-soft shadow-[0_20px_50px_-20px_rgba(0,0,0,1)]">
          {toast}
        </div>
      ) : null}

      {error && activeId ? (
        <div className="fixed bottom-16 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 rounded-xl border border-ember/40 bg-[#1b1210] px-3 py-2 text-[11.5px] text-[#f0b7a2]">
          <div className="flex items-start gap-2">
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)} className="text-muted hover:text-cream">
              dismiss
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
