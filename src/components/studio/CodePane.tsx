"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { highlightLines, languageLabel } from "@/lib/highlight";
import type { WorkspaceFile } from "@/lib/types";
import RuntimePreview from "./RuntimePreview";
import {
  Check,
  Chevron,
  Code,
  Copy,
  Download,
  Eye,
  FileIcon,
  Pencil,
  Plus,
  Refresh,
  Trash,
} from "./icons";

type Props = {
  projectId: string;
  runtimeRestartSignal: number;
  agentBusy: boolean;
  onFixRuntimeError: (logs: string) => void;
  onAutoFixRuntimeError: (logs: string) => Promise<boolean>;
  files: WorkspaceFile[];
  activeFile: WorkspaceFile | null;
  mode: "code" | "preview";
  previewDoc: string | null;
  onSelectId: (id: string) => void;
  onSave: (file: WorkspaceFile, content: string) => Promise<void> | void;
  onDelete: (file: WorkspaceFile) => void;
  onCreate: () => void;
};

const iconFor = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const colours: Record<string, string> = {
    html: "text-[#d9a88c]",
    css: "text-[#a8c69a]",
    js: "text-[#e2c78a]",
    py: "text-[#9db8d6]",
    md: "text-cream-soft",
    json: "text-[#d8bd85]",
  };
  return colours[ext] ?? "text-muted";
};

export default function CodePane({
  projectId,
  runtimeRestartSignal,
  agentBusy,
  onFixRuntimeError,
  onAutoFixRuntimeError,
  files,
  activeFile,
  mode,
  previewDoc,
  onSelectId,
  onSave,
  onDelete,
  onCreate,
}: Props) {
  const activeFileKey = activeFile ? `${activeFile.id}:${activeFile.updatedAt}` : "";
  const [editorState, setEditorState] = useState({
    fileKey: activeFileKey,
    draft: activeFile?.content ?? "",
    editing: false,
  });
  const currentEditorState = editorState.fileKey === activeFileKey
    ? editorState
    : { fileKey: activeFileKey, draft: activeFile?.content ?? "", editing: false };
  const { draft, editing } = currentEditorState;
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const realFiles = files.filter((file) => file.kind === "file");
  const hasPackageJson = realFiles.some((file) => file.path.replace(/^\.\//, "") === "package.json");

  const lines = useMemo(
    () => highlightLines(editing ? draft : (activeFile?.content ?? ""), activeFile?.language ?? "plaintext"),
    [activeFile, draft, editing],
  );

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  async function save() {
    if (!activeFile) return;
    setSaving(true);
    try {
      await onSave(activeFile, draft);
      setSavedAt(Date.now());
      setEditorState({ fileKey: activeFileKey, draft, editing: false });
    } finally {
      setSaving(false);
    }
  }

  async function copy() {
    if (!activeFile) return;
    await navigator.clipboard.writeText(editing ? draft : activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function download() {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = activeFile.name;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-panel/40">
      <div className="flex items-center gap-2 overflow-x-auto border-b border-line px-3 py-2 no-scrollbar">
        <div className="relative flex min-w-0 items-center gap-1.5 md:hidden">
          <select
            value={activeFile?.id ?? ""}
            onChange={(event) => onSelectId(event.target.value)}
            aria-label="Select file"
            className="max-w-[140px] appearance-none truncate rounded border border-line bg-panel py-1 pl-2 pr-6 font-mono text-[11px] text-cream"
          >
            {realFiles.map((file) => (
              <option key={file.id} value={file.id}>
                {file.path}
              </option>
            ))}
          </select>
          <Chevron size={11} className="pointer-events-none absolute right-1.5 text-muted" />
        </div>

        {activeFile ? (
          <div className="hidden min-w-0 items-center gap-1.5 md:flex">
            <FileIcon size={13} className={iconFor(activeFile.name)} />
            <span className="truncate font-mono text-[11.5px] text-cream-soft">{activeFile.path}</span>
            <span className="rounded border border-line px-1.5 py-[1px] text-[9px] uppercase tracking-[0.1em] text-muted-dim">
              {languageLabel(activeFile.language)}
            </span>
          </div>
        ) : (
          <span className="hidden text-[11.5px] text-muted md:inline">No file selected</span>
        )}

        <div className="ml-auto flex items-center gap-1">
          {activeFile ? (
            <>
              <button
                type="button"
              onClick={() =>
                editing
                  ? void save()
                  : setEditorState({ fileKey: activeFileKey, draft, editing: true })
              }
                title={editing ? "Save changes" : "Edit file"}
                disabled={saving}
                className={`grid h-7 w-7 place-items-center rounded border transition ${
                  editing
                    ? "border-gold/40 bg-gold/15 text-gold"
                    : "border-line text-muted hover:border-line-strong hover:text-cream"
                }`}
              >
                {editing ? <Check size={13} /> : <Pencil size={13} />}
              </button>
              <button
                type="button"
                onClick={() => void copy()}
                title="Copy file"
                className="grid h-7 w-7 place-items-center rounded border border-line text-muted transition hover:border-line-strong hover:text-cream"
              >
                {copied ? <Check size={13} className="text-gold" /> : <Copy size={13} />}
              </button>
              <button
                type="button"
                onClick={download}
                title="Download file"
                className="grid h-7 w-7 place-items-center rounded border border-line text-muted transition hover:border-line-strong hover:text-cream"
              >
                <Download size={13} />
              </button>
              <button
                type="button"
                onClick={() => onDelete(activeFile)}
                title="Delete file"
                className="grid h-7 w-7 place-items-center rounded border border-line text-muted transition hover:border-ember/50 hover:text-ember"
              >
                <Trash size={13} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onCreate}
              className="flex items-center gap-1 rounded border border-line px-2 py-1 text-[11px] text-muted hover:text-cream"
            >
              <Plus size={11} /> New file
            </button>
          )}
        </div>
      </div>

      {hasPackageJson ? (
        <div className={`min-h-0 flex-1 ${mode === "preview" ? "flex" : "hidden"}`}>
          <RuntimePreview
            key={projectId}
            projectId={projectId}
            files={files}
            restartSignal={runtimeRestartSignal}
            autoStart={mode === "preview"}
            agentBusy={agentBusy}
            onFixErrors={onFixRuntimeError}
            onAutoFixErrors={onAutoFixRuntimeError}
          />
        </div>
      ) : null}

      {mode === "preview" && !hasPackageJson ? (
        previewDoc ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-2 border-b border-line bg-panel/60 px-3 py-1.5">
              <span className="flex items-center gap-1.5 text-[10px] text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-[#a8c69a]" />
                Live HTML preview · index.html
              </span>
              <button
                type="button"
                onClick={() => setPreviewKey((key) => key + 1)}
                className="ml-auto flex items-center gap-1 rounded border border-line px-1.5 py-1 text-[10px] text-muted hover:text-cream"
              >
                <Refresh size={10} /> Reload
              </button>
            </div>
            <iframe
              key={previewKey}
              title="Project preview"
              srcDoc={previewDoc}
              sandbox="allow-scripts allow-forms allow-modals allow-popups"
              className="min-h-0 w-full flex-1 bg-white"
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-panel-2 text-gold/70">
              <Eye size={18} />
            </div>
            <p className="max-w-[38ch] text-[13px] leading-relaxed text-muted">
              This project has no <span className="font-mono text-cream-soft">index.html</span> or
              <span className="font-mono text-cream-soft"> package.json</span> entry point to preview.
              Open the files to read the code.
            </p>
          </div>
        )
      ) : null}

      {mode === "code" && activeFile ? (
        <div className="relative flex min-h-0 flex-1 overflow-auto">
          <div className="sticky left-0 z-10 select-none border-r border-line bg-panel/70 px-2.5 py-3 text-right font-mono text-[11.5px] leading-[1.75] text-muted-dim">
            {(editing ? draft.split("\n") : activeFile.content.split("\n")).map((_, index) => (
              <div key={index}>{index + 1}</div>
            ))}
          </div>

          {editing ? (
            <textarea
              ref={textareaRef}
              value={draft}
              spellCheck={false}
              onChange={(event) =>
                setEditorState({ fileKey: activeFileKey, draft: event.target.value, editing: true })
              }
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
                  event.preventDefault();
                  void save();
                }
                if (event.key === "Escape") {
                  setEditorState({
                    fileKey: activeFileKey,
                    draft: activeFile?.content ?? "",
                    editing: false,
                  });
                }
              }}
              className="min-h-full min-w-[560px] flex-1 resize-none whitespace-pre bg-transparent px-4 py-3 font-mono text-[11.5px] leading-[1.75] text-cream caret-gold focus:outline-none"
            />
          ) : (
            <pre className="min-h-full min-w-full flex-1 whitespace-pre px-4 py-3 font-mono text-[11.5px] leading-[1.75]">
              {lines.map((tokens, index) => (
                <div key={index} className="min-h-[1.75em]">
                  {tokens.length === 0 ? (
                    <span>&nbsp;</span>
                  ) : (
                    tokens.map((token, tokenIndex) => (
                      <span key={tokenIndex} className={token.cls ?? ""}>
                        {token.text}
                      </span>
                    ))
                  )}
                </div>
              ))}
            </pre>
          )}
        </div>
      ) : mode === "code" ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-panel-2 text-gold/70">
            <Code size={18} />
          </div>
          <p className="max-w-[36ch] text-[13px] leading-relaxed text-muted">
            Select a file in the tree, or ask the agent for a build and it will create the
            whole structure for you.
          </p>
          <button
            type="button"
            onClick={onCreate}
            className="rounded-full border border-line px-3 py-1.5 text-[11.5px] text-cream-soft transition hover:border-line-strong"
          >
            Create a file
          </button>
        </div>
      ) : null}

      {activeFile ? (
        <div className="flex items-center justify-between gap-3 border-t border-line bg-panel/60 px-3 py-1.5 font-mono text-[10px] text-muted-dim">
          <span>
            {activeFile.path} · {activeFile.content.split("\n").length} lines ·{" "}
            {(new Blob([activeFile.content]).size / 1024).toFixed(1)} kB
          </span>
          <span>
            {editing
              ? "Editing · ⌘S to save · Esc to cancel"
              : savedAt
                ? "Saved to workspace"
                : activeFile.language.toUpperCase()}
          </span>
        </div>
      ) : null}
    </div>
  );
}
