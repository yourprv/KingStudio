"use client";

import { useMemo, useState } from "react";
import type { WorkspaceFile } from "@/lib/types";
import { Chevron, Close, Database, Download, FileIcon, FolderIcon, Plus, Trash } from "./icons";

type Props = {
  files: WorkspaceFile[];
  activeId: string | null;
  storageLabel: string;
  onSelect: (file: WorkspaceFile) => void;
  onCreate: (path: string, kind: "file" | "folder") => void;
  onDelete: (file: WorkspaceFile) => void;
  onDownloadAll: () => void;
};

type Node = {
  name: string;
  path: string;
  kind: "file" | "folder";
  children: Node[];
  file?: WorkspaceFile;
};

function buildTree(files: WorkspaceFile[]): Node[] {
  const root: Node[] = [];

  for (const file of files) {
    const segments = file.path.split("/").filter(Boolean);
    if (segments.length === 0) continue;

    if (file.kind === "folder") {
      ensureFolderWithPath(segments, root);
      continue;
    }
    const filename = segments.pop() ?? file.path;
    const parent = segments.length ? ensureFolderWithPath(segments, root) : root;
    parent.push({
      name: filename,
      path: file.path,
      kind: "file",
      children: [],
      file,
    });
  }

  const sort = (nodes: Node[]): Node[] => {
    nodes.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((node) => sort(node.children));
    return nodes;
  };

  return sort(root);
}

/** Builds the folder chain using the full accumulated path. */
function ensureFolderWithPath(segments: string[], nodes: Node[]): Node[] {
  let level = nodes;
  let accumulated = "";
  for (const segment of segments) {
    accumulated = accumulated ? `${accumulated}/${segment}` : segment;
    let folder = level.find((node) => node.kind === "folder" && node.path === accumulated);
    if (!folder) {
      folder = { name: segment, path: accumulated, kind: "folder", children: [] };
      level.push(folder);
    }
    level = folder.children;
  }
  return level;
}

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

export default function FileTree({
  files,
  activeId,
  storageLabel,
  onSelect,
  onCreate,
  onDelete,
  onDownloadAll,
}: Props) {
  const tree = useMemo(() => buildTree(files), [files]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);
  const [draft, setDraft] = useState("");

  const fileCount = files.filter((file) => file.kind === "file").length;

  function commitCreate() {
    const value = draft.trim();
    if (creating && value) onCreate(value, creating);
    setDraft("");
    setCreating(null);
  }

  function renderNodes(nodes: Node[], depth = 0) {
    return nodes.map((node) => {
      if (node.kind === "folder") {
        const isOpen = !collapsed[node.path];
        return (
          <div key={node.path}>
            <button
              type="button"
              onClick={() => setCollapsed((c) => ({ ...c, [node.path]: isOpen }))}
              className="group flex w-full items-center gap-1.5 rounded px-2 py-[5px] text-left text-[12px] text-cream-soft transition hover:bg-panel-2"
              style={{ paddingLeft: 8 + depth * 12 }}
            >
              <Chevron
                size={11}
                className={`shrink-0 text-muted-dim transition-transform ${isOpen ? "" : "-rotate-90"}`}
              />
              <FolderIcon size={13} className="shrink-0 text-gold/70" />
              <span className="truncate">{node.name}</span>
              {!node.children.length ? (
                <span className="ml-auto text-[9px] text-muted-dim">empty</span>
              ) : null}
            </button>
            {isOpen ? <div>{renderNodes(node.children, depth + 1)}</div> : null}
          </div>
        );
      }

      const file = node.file;
      if (!file) return null;
      const active = file.id === activeId;

      return (
        <div
          key={node.path}
          className={`group flex items-center rounded transition ${
            active ? "bg-panel-3" : "hover:bg-panel-2"
          }`}
        >
          <button
            type="button"
            onClick={() => onSelect(file)}
            className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-[5px] text-left text-[12px]"
            style={{ paddingLeft: 8 + depth * 12 + 12 }}
          >
            <FileIcon size={13} className={`shrink-0 ${iconFor(node.name)}`} />
            <span className={`truncate ${active ? "text-cream" : "text-muted"}`}>{node.name}</span>
            {file.storagePath ? (
              <Database
                size={9}
                className="ml-auto shrink-0 text-gold/50"
                aria-label={file.storagePath ?? "stored"}
              />
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => onDelete(file)}
            aria-label={`Delete ${file.path}`}
            className="mr-1 hidden rounded p-1 text-muted-dim hover:text-ember group-hover:block"
          >
            <Trash size={11} />
          </button>
        </div>
      );
    });
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-shell/60">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted">
          Files <span className="text-muted-dim">· {fileCount}</span>
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => {
              setCreating("file");
              setDraft("");
            }}
            title="New file"
            className="grid h-6 w-6 place-items-center rounded text-muted transition hover:bg-panel-2 hover:text-cream"
          >
            <Plus size={13} />
          </button>
          <button
            type="button"
            onClick={() => {
              setCreating("folder");
              setDraft("");
            }}
            title="New folder"
            className="grid h-6 w-6 place-items-center rounded text-muted transition hover:bg-panel-2 hover:text-cream"
          >
            <FolderIcon size={13} />
          </button>
          <button
            type="button"
            onClick={onDownloadAll}
            title="Download project files"
            className="grid h-6 w-6 place-items-center rounded text-muted transition hover:bg-panel-2 hover:text-cream"
          >
            <Download size={13} />
          </button>
        </div>
      </div>

      {creating ? (
        <div className="border-b border-line bg-panel/60 px-2 py-2">
          <div className="flex items-center gap-1.5">
            {creating === "folder" ? (
              <FolderIcon size={13} className="text-gold/70" />
            ) : (
              <FileIcon size={13} className="text-cream-soft" />
            )}
            <input
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitCreate();
                if (event.key === "Escape") {
                  setCreating(null);
                  setDraft("");
                }
              }}
              placeholder={creating === "folder" ? "components/ui" : "src/app.js"}
              className="min-w-0 flex-1 bg-transparent font-mono text-[11.5px] text-cream placeholder:text-muted-dim focus:outline-none"
            />
            <button
              type="button"
              onClick={commitCreate}
              className="rounded border border-line px-1.5 py-0.5 text-[10px] text-cream-soft hover:border-line-strong"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(null);
                setDraft("");
              }}
              className="p-0.5 text-muted-dim hover:text-cream"
              aria-label="Cancel"
            >
              <Close size={12} />
            </button>
          </div>
          <p className="mt-1.5 pl-[19px] text-[9.5px] text-muted-dim">
            Use a path with slashes to nest folders.
          </p>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto py-1.5 pr-1">
        {tree.length === 0 ? (
          <p className="px-3 py-4 text-[11.5px] leading-relaxed text-muted-dim">
            No files yet. Ask the agent to build something, or add a file above.
          </p>
        ) : (
          renderNodes(tree)
        )}
      </div>

      <div className="flex items-center gap-1.5 border-t border-line px-3 py-2 text-[9.5px] text-muted-dim">
        <Database size={10} className="text-gold/60" />
        <span className="truncate">{storageLabel}</span>
      </div>
    </div>
  );
}
