import type { WorkspaceFile } from "@/lib/types";

function findFile(files: WorkspaceFile[], current: string, from: string): WorkspaceFile | undefined {
  const baseDir = from.includes("/") ? from.slice(0, from.lastIndexOf("/") + 1) : "";
  const candidates = [current, current.replace(/^\.\//, ""), baseDir + current.replace(/^\.\//, "")];
  return candidates
    .map((path) => files.find((file) => file.path.replace(/^\.\//, "") === path))
    .find(Boolean);
}

/**
 * Builds a single self-contained HTML document so the generated project can be
 * previewed inside a sandboxed iframe. Handles the common relative link/script
 * patterns used by the templates.
 */
export function buildPreviewDocument(files: WorkspaceFile[]): string | null {
  const sourceFiles = files.filter((file) => file.kind === "file");
  const entry =
    sourceFiles.find((file) => file.path === "index.html") ??
    sourceFiles.find((file) => file.path.endsWith("index.html")) ??
    sourceFiles.find((file) => file.path.endsWith(".html"));

  if (!entry) return null;

  let html = entry.content;

  // Inline stylesheets
  html = html.replace(
    /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
    (match, href: string) => {
      const css = findFile(sourceFiles, href, entry.path);
      if (!css) return match;
      return `<style>\n/* ${css.path} */\n${css.content}\n</style>`;
    },
  );

  // Inline scripts
  html = html.replace(
    /<script[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi,
    (match, src: string) => {
      const js = findFile(sourceFiles, src, entry.path);
      if (!js) return match;
      return `<script>\n/* ${js.path} */\n${js.content}\n</script>`;
    },
  );

  // Add a runtime error surface so broken generated code is debuggable.
  const guard = `<script>
window.addEventListener('error', function (event) {
  var box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;background:#1b1210;color:#ffb4a2;border:1px solid #4a2a22;border-radius:10px;padding:10px 14px;font:12px/1.5 ui-monospace,monospace;';
  box.textContent = 'Runtime error: ' + (event.message || 'unknown');
  document.body.appendChild(box);
}, true);
</script>`;

  return html.replace(new RegExp(`</head>`, "i"), `${guard}</head>`);
}

export function isPreviewable(files: WorkspaceFile[]) {
  return files.some((file) => file.kind === "file" && file.path.endsWith(".html"));
}


