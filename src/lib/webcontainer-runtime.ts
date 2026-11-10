import type { FileSystemTree, WebContainer } from "@webcontainer/api";
import type { WorkspaceFile } from "@/lib/types";

type RuntimeGlobal = typeof globalThis & {
  __kiteWebContainerPromise?: Promise<WebContainer>;
};

export function bootBrowserRuntime() {
  const host = globalThis as RuntimeGlobal;
  if (!host.__kiteWebContainerPromise) {
    host.__kiteWebContainerPromise = import("@webcontainer/api")
      .then(({ WebContainer }) =>
        WebContainer.boot({
          coep: "credentialless",
          forwardPreviewErrors: "exceptions-only",
        }),
      )
      .catch((error: unknown) => {
        host.__kiteWebContainerPromise = undefined;
        throw error;
      });
  }
  return host.__kiteWebContainerPromise;
}

export function safeWorkspacePath(path: string) {
  const segments = path.replace(/\\/g, "/").split("/").filter((segment) => segment && segment !== ".");
  if (segments.length === 0 || segments.some((segment) => segment === "..")) return null;
  return segments.join("/");
}

export function filesToTree(files: WorkspaceFile[]): FileSystemTree {
  const tree: FileSystemTree = {};

  for (const file of files) {
    const path = safeWorkspacePath(file.path);
    if (!path) continue;
    const segments = path.split("/");
    let directory = tree;

    if (file.kind === "folder") {
      for (const segment of segments) {
        const existing = directory[segment];
        if (!existing || !("directory" in existing)) {
          directory[segment] = { directory: {} };
        }
        directory = (directory[segment] as { directory: FileSystemTree }).directory;
      }
      continue;
    }

    for (const segment of segments.slice(0, -1)) {
      const existing = directory[segment];
      if (!existing || !("directory" in existing)) {
        directory[segment] = { directory: {} };
      }
      directory = (directory[segment] as { directory: FileSystemTree }).directory;
    }
    directory[segments[segments.length - 1]] = { file: { contents: file.content } };
  }

  return tree;
}

// WebContainer fs paths are already scoped to the instance workdir. Prefixing
// runtime.workdir here resolves the workdir twice (for example /home/app/home/app).
const runtimePath = (path: string) => `/${path.replace(/^\/+/, "")}`;

export async function resetRuntimeFiles(
  runtime: WebContainer,
  files: WorkspaceFile[],
  keepDependencies: boolean,
) {
  const existing = await runtime.fs.readdir("/");
  for (const name of existing) {
    if (keepDependencies && name === "node_modules") continue;
    await runtime.fs.rm(runtimePath(name), { force: true, recursive: true });
  }
  await runtime.mount(filesToTree(files));
}

export async function syncRuntimeFiles(
  runtime: WebContainer,
  files: WorkspaceFile[],
  previousFiles: Map<string, string>,
) {
  const current = new Map<string, WorkspaceFile>();
  for (const file of files) {
    const path = safeWorkspacePath(file.path);
    if (path) current.set(path, file);
  }

  for (const [path] of previousFiles) {
    if (!current.has(path)) {
      await runtime.fs.rm(runtimePath(path), { force: true, recursive: true });
    }
  }

  for (const [path, file] of current) {
    if (file.kind === "folder") {
      await runtime.fs.mkdir(runtimePath(path), { recursive: true });
    } else if (previousFiles.get(path) !== file.content) {
      const parent = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
      if (parent) await runtime.fs.mkdir(runtimePath(parent), { recursive: true });
      await runtime.fs.writeFile(runtimePath(path), file.content);
    }
  }

  return new Map(
    [...current].filter(([, file]) => file.kind === "file").map(([path, file]) => [path, file.content]),
  );
}
