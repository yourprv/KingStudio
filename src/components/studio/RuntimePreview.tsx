"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WebContainer, WebContainerProcess } from "@webcontainer/api";
import type { WorkspaceFile } from "@/lib/types";
import {
  bootBrowserRuntime,
  resetRuntimeFiles,
  syncRuntimeFiles,
} from "@/lib/webcontainer-runtime";
import { Alert, ExternalLink, Play, Square, Terminal } from "./icons";

type RuntimeStatus = "idle" | "booting" | "installing" | "starting" | "ready" | "repairing" | "error" | "stopped";
type RunMode = "manual" | "auto-start" | "repair-retry" | "resume";
const MAX_AUTO_REPAIRS = 2;

const STATUS_LABEL: Record<RuntimeStatus, string> = {
  idle: "Ready to run",
  booting: "Starting browser runtime",
  installing: "Installing packages",
  starting: "Starting dev server",
  ready: "Running in your browser",
  repairing: "Kite is repairing this run",
  error: "Needs attention",
  stopped: "Stopped",
};

const ERROR_LINE = /npm (?:ERR!|error)|(?:^|\s)error TS\d+|SyntaxError:|TypeError:|ReferenceError:|Module not found|Cannot find module|Failed to compile|Could not resolve|error when starting dev server|\bBuild failed\b|Failed to scan for dependencies|Pre-transform error|Transform failed|Unexpected token|Expected\s+.{1,100}\s+but found|Internal server error|\[\s*ERROR\s*\]|\[(?:runtime|preview) error\]|(?:npm install|dev server) exited with code/i;
const BUILD_FAILURE = /error TS\d+|SyntaxError:|TypeError:|ReferenceError:|Module not found|Cannot find module|Failed to compile|Could not resolve|error when starting dev server|\bBuild failed\b|Failed to scan for dependencies|Pre-transform error|Transform failed|Unexpected token|Expected\s+.{1,100}\s+but found|Internal server error|\[\s*ERROR\s*\]/i;
const stripAnsi = (value: string) => value
  .replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g, "")
  .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "")
  .replace(/\r\n?/g, "\n");

function packageManifest(files: WorkspaceFile[]) {
  const file = files.find((item) => item.kind === "file" && item.path.replace(/^\.\//, "") === "package.json");
  if (!file) return null;
  try {
    return JSON.parse(file.content) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
  } catch {
    return "invalid" as const;
  }
}

function serverCommand(manifest: Exclude<ReturnType<typeof packageManifest>, null | "invalid">) {
  const scripts = manifest.scripts ?? {};
  const script = scripts.dev ? "dev" : scripts.start ? "start" : null;
  if (!script) return null;
  const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
  const isNext = Boolean(dependencies.next) || /(?:^|\s)next\s+(?:dev|start)(?:\s|$)/.test(scripts[script]);
  const acceptsHostFlag = isNext || /\b(vite|astro|react-scripts|webpack-dev-server|parcel|nuxt)\b/.test(scripts[script]);
  const args = ["run", script, ...(acceptsHostFlag ? ["--", ...(isNext ? ["--hostname", "0.0.0.0"] : ["--host", "0.0.0.0"])] : [])];
  return args;
}

export default function RuntimePreview({
  projectId,
  files,
  restartSignal,
  autoStart,
  agentBusy,
  onFixErrors,
  onAutoFixErrors,
}: {
  projectId: string;
  files: WorkspaceFile[];
  restartSignal: number;
  autoStart: boolean;
  agentBusy: boolean;
  onFixErrors: (logs: string) => void;
  onAutoFixErrors: (logs: string) => Promise<boolean>;
}) {
  const manifest = useMemo(() => packageManifest(files), [files]);
  const [status, setStatus] = useState<RuntimeStatus>("idle");
  const statusRef = useRef<RuntimeStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState("Click Run to install this project's packages and start its dev server.\n");
  const terminalOutputRef = useRef(terminalOutput);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [repairAttempt, setRepairAttempt] = useState(0);
  const runtimeRef = useRef<WebContainer | null>(null);
  const processRef = useRef<WebContainerProcess | null>(null);
  const projectRef = useRef<string | null>(null);
  const syncedFilesRef = useRef<Map<string, string>>(new Map());
  const syncQueueRef = useRef<Promise<void>>(Promise.resolve());
  const runIdRef = useRef(0);
  const serverUnsubscribeRef = useRef<(() => void) | null>(null);
  const serverTimeoutRef = useRef<number | null>(null);
  const previewUnsubscribeRef = useRef<(() => void) | null>(null);
  const runtimeUnsubscribeRef = useRef<(() => void) | null>(null);
  const repairAttemptsRef = useRef(0);
  const repairInProgressRef = useRef(false);
  const repairLimitReachedRef = useRef(false);
  const repairTimerRef = useRef<number | null>(null);
  const startedProjectRef = useRef<string | null>(null);
  const activeProjectIdRef = useRef(projectId);
  const restartSignalRef = useRef(restartSignal);
  const errorCount = useMemo(
    () => terminalOutput.split("\n").filter((line) => ERROR_LINE.test(line)).length,
    [terminalOutput],
  );

  const updateStatus = useCallback((next: RuntimeStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const replaceOutput = useCallback((value: string) => {
    terminalOutputRef.current = value.slice(-48_000);
    setTerminalOutput(terminalOutputRef.current);
  }, []);

  const appendOutput = useCallback((value: string) => {
    const clean = stripAnsi(value);
    if (!clean) return;
    terminalOutputRef.current = `${terminalOutputRef.current}${clean}`.slice(-48_000);
    setTerminalOutput(terminalOutputRef.current);
  }, []);

  useEffect(() => {
    activeProjectIdRef.current = projectId;
  }, [projectId]);

  const requestAutoRepair = useCallback(async (reason: string) => {
    if (repairInProgressRef.current) return false;
    if (repairAttemptsRef.current >= MAX_AUTO_REPAIRS) {
      if (!repairLimitReachedRef.current) {
        repairLimitReachedRef.current = true;
        updateStatus("error");
        setTerminalOpen(true);
        appendOutput(`Automatic repair limit reached (${MAX_AUTO_REPAIRS} attempts). Review the terminal and try a manual fix.\n`);
      }
      return false;
    }
    repairInProgressRef.current = true;
    repairAttemptsRef.current += 1;
    const attempt = repairAttemptsRef.current;
    setRepairAttempt(attempt);
    runIdRef.current += 1;
    processRef.current?.kill();
    processRef.current = null;
    serverUnsubscribeRef.current?.();
    serverUnsubscribeRef.current = null;
    setPreviewUrl(null);
    setTerminalOpen(true);
    updateStatus("repairing");
    appendOutput(`\n[auto repair ${attempt}/${MAX_AUTO_REPAIRS}] ${reason}\nSending the terminal output to Kite…\n`);

    try {
      const repaired = await onAutoFixErrors(terminalOutputRef.current.slice(-12_000));
      repairInProgressRef.current = false;
      if (activeProjectIdRef.current !== projectId) return false;
      if (repaired) {
        appendOutput("Kite updated the project. Restarting the browser run…\n");
        return true;
      }
      updateStatus("error");
      appendOutput("Automatic repair could not update the project. Review the error or use Ask Kite to fix.\n");
      return false;
    } catch (error) {
      repairInProgressRef.current = false;
      updateStatus("error");
      appendOutput(`Automatic repair failed: ${error instanceof Error ? error.message : "unknown error"}\n`);
      return false;
    }
  }, [appendOutput, onAutoFixErrors, projectId, updateStatus]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime || projectRef.current !== projectId) return;
    let cancelled = false;
    syncQueueRef.current = syncQueueRef.current.then(async () => {
      if (cancelled || runtimeRef.current !== runtime || projectRef.current !== projectId) return;
      const next = await syncRuntimeFiles(runtime, files, syncedFilesRef.current);
      if (!cancelled) syncedFilesRef.current = next;
    });
    return () => {
      cancelled = true;
    };
  }, [files, projectId]);

  useEffect(
    () => () => {
      runIdRef.current += 1;
      if (serverTimeoutRef.current !== null) window.clearTimeout(serverTimeoutRef.current);
      if (repairTimerRef.current !== null) window.clearTimeout(repairTimerRef.current);
      processRef.current?.kill();
      serverUnsubscribeRef.current?.();
      previewUnsubscribeRef.current?.();
      runtimeUnsubscribeRef.current?.();
    },
    [],
  );

  const streamProcess = useCallback(async (process: WebContainerProcess, runId: number) => {
    const output = process.output.pipeTo(
      new WritableStream({
        write(chunk) {
          if (runId !== runIdRef.current) return;
          appendOutput(chunk);
          if ((statusRef.current === "starting" || statusRef.current === "ready") && BUILD_FAILURE.test(stripAnsi(chunk))) {
            if (repairTimerRef.current !== null) window.clearTimeout(repairTimerRef.current);
            repairTimerRef.current = window.setTimeout(() => {
              repairTimerRef.current = null;
              void requestAutoRepair("The dev server reported a compile or runtime error.");
            }, 700);
          }
        },
      }),
    );
    const exitCode = await process.exit;
    await output.catch(() => undefined);
    return exitCode;
  }, [appendOutput, requestAutoRepair]);

  const runProject = useCallback(async (runMode: RunMode = "manual") => {
    if (
      runMode !== "auto-start" &&
      (statusRef.current === "booting" || statusRef.current === "installing" || statusRef.current === "starting")
    ) return;
    if (runMode !== "repair-retry" && runMode !== "resume") {
      repairAttemptsRef.current = 0;
      repairInProgressRef.current = false;
      repairLimitReachedRef.current = false;
      setRepairAttempt(0);
    }
    runIdRef.current += 1;
    const runId = runIdRef.current;
    processRef.current?.kill();
    serverUnsubscribeRef.current?.();
    serverUnsubscribeRef.current = null;
    if (serverTimeoutRef.current !== null) window.clearTimeout(serverTimeoutRef.current);
    serverTimeoutRef.current = null;
    setPreviewUrl(null);
    if (runMode === "repair-retry") appendOutput("\nRetrying after Kite's repair…\n");
    else if (runMode === "resume") appendOutput("\nResuming preview…\n");
    else replaceOutput("");

    if (!manifest) {
      updateStatus("error");
      appendOutput("No root package.json was found. Add a package.json with a dev or start script to run this project here.\n");
      setTerminalOpen(true);
      return;
    }
    if (manifest === "invalid") {
      updateStatus("error");
      appendOutput("Could not read package.json: the file is not valid JSON.\n");
      setTerminalOpen(true);
      void requestAutoRepair("package.json is not valid JSON.");
      return;
    }
    const command = serverCommand(manifest);
    if (!command) {
      updateStatus("error");
      appendOutput("No dev or start script was found in package.json. Add scripts.dev or scripts.start, then run again.\n");
      setTerminalOpen(true);
      void requestAutoRepair("package.json does not define a dev or start script.");
      return;
    }

    try {
      if (!window.crossOriginIsolated) {
        throw new Error("This page is not cross-origin isolated yet. Restart the Next.js server so its new WebContainer headers take effect.");
      }
      updateStatus("booting");
      appendOutput("Booting the isolated Node.js environment…\n");
      const runtime = runtimeRef.current ?? (await bootBrowserRuntime());
      if (runId !== runIdRef.current) return;
      runtimeRef.current = runtime;

      previewUnsubscribeRef.current?.();
      previewUnsubscribeRef.current = runtime.on("preview-message", (message) => {
        const detail = "message" in message
          ? message.message
          : message.args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" ");
        appendOutput(`\n[preview error] ${detail}\n`);
        setTerminalOpen(true);
        void requestAutoRepair(`The running preview raised an uncaught error: ${detail}`);
      });
      runtimeUnsubscribeRef.current?.();
      runtimeUnsubscribeRef.current = runtime.on("error", (event) => {
        appendOutput(`\n[runtime error] ${event.message}\n`);
        setTerminalOpen(true);
      });

      await syncQueueRef.current.catch(() => undefined);
      const sameProject = projectRef.current === projectId;
      await resetRuntimeFiles(runtime, files, sameProject);
      projectRef.current = projectId;
      syncedFilesRef.current = new Map(
        files
          .filter((file) => file.kind === "file")
          .map((file) => [file.path.replace(/^\.\//, "").replace(/\\/g, "/"), file.content]),
      );
      if (runId !== runIdRef.current) return;

      updateStatus("installing");
      appendOutput("$ npm install\n");
      const install = await runtime.spawn("npm", ["install", "--no-progress", "--no-audit", "--no-fund"], { terminal: { cols: 100, rows: 18 } });
      processRef.current = install;
      const installExit = await streamProcess(install, runId);
      if (runId !== runIdRef.current) return;
      processRef.current = null;
      if (installExit !== 0) {
        appendOutput(`\nnpm install exited with code ${installExit}.\n`);
        await requestAutoRepair(`npm install exited with code ${installExit}.`);
        return;
      }

      updateStatus("starting");
      appendOutput(`\n$ npm ${command.map((part) => JSON.stringify(part)).join(" ")}\n`);
      let serverIsReady = false;
      const serverWait: {
        reject?: (reason: Error) => void;
        unsubscribe?: () => void;
      } = {};
      const ready = new Promise<string>((resolve, reject) => {
        serverWait.reject = reject;
        serverTimeoutRef.current = window.setTimeout(() => {
          serverWait.unsubscribe?.();
          serverWait.unsubscribe = undefined;
          serverUnsubscribeRef.current = null;
          serverTimeoutRef.current = null;
          reject(new Error("The server did not become ready within 90 seconds."));
        }, 90_000);
        serverWait.unsubscribe = runtime.on("server-ready", (_port, url) => {
          serverWait.unsubscribe?.();
          serverWait.unsubscribe = undefined;
          serverUnsubscribeRef.current = null;
          if (serverTimeoutRef.current !== null) window.clearTimeout(serverTimeoutRef.current);
          serverTimeoutRef.current = null;
          serverIsReady = true;
          const isExpress = Boolean(manifest.dependencies?.express || manifest.devDependencies?.express);
          setPreviewUrl(isExpress ? new URL("/health", url).toString() : url);
          updateStatus("ready");
          resolve(url);
        });
      });
      void ready.catch(() => undefined);

      let devServer: WebContainerProcess;
      try {
        devServer = await runtime.spawn("npm", command, { terminal: { cols: 100, rows: 18 } });
      } catch (error) {
        if (serverTimeoutRef.current !== null) window.clearTimeout(serverTimeoutRef.current);
        serverTimeoutRef.current = null;
        serverWait.unsubscribe?.();
        serverWait.unsubscribe = undefined;
        serverUnsubscribeRef.current = null;
        serverWait.reject?.(error instanceof Error ? error : new Error("Could not start the dev server."));
        throw error;
      }
      processRef.current = devServer;
      void streamProcess(devServer, runId).then(async (exitCode) => {
        if (runId !== runIdRef.current) return;
        processRef.current = null;
        if (exitCode !== 0) {
          updateStatus("error");
          setPreviewUrl(null);
          setTerminalOpen(true);
          appendOutput(`\nDev server exited with code ${exitCode}.\n`);
          if (!serverIsReady) serverWait.reject?.(new Error(`The dev server exited with code ${exitCode} before the preview was ready.`));
          await requestAutoRepair(`The dev server exited with code ${exitCode}.`);
        } else if (!serverIsReady) {
          updateStatus("error");
          appendOutput("\nThe start script finished before a preview server became ready.\n");
          serverWait.reject?.(new Error("The start script finished before the preview server was ready."));
          await requestAutoRepair("The start script exited before a preview server became ready.");
        } else {
          updateStatus("stopped");
          setPreviewUrl(null);
        }
      });
      await ready;
    } catch (error) {
      if (runId !== runIdRef.current) return;
      const message = error instanceof Error ? error.message : "The browser runtime could not start.";
      processRef.current?.kill();
      processRef.current = null;
      if (serverTimeoutRef.current !== null) window.clearTimeout(serverTimeoutRef.current);
      serverTimeoutRef.current = null;
      updateStatus("error");
      setPreviewUrl(null);
      setTerminalOpen(true);
      appendOutput(`\n${message}\n`);
      if (message.includes("did not become ready")) void requestAutoRepair(message);
    }
  }, [appendOutput, files, manifest, projectId, replaceOutput, requestAutoRepair, streamProcess, updateStatus]);

  useEffect(() => {
    if (!autoStart) return;
    if (startedProjectRef.current !== projectId) {
      startedProjectRef.current = projectId;
      void runProject("auto-start");
      return;
    }
    if (statusRef.current === "error" || statusRef.current === "stopped") {
      void runProject("resume");
    }
  }, [autoStart, projectId, runProject]);

  useEffect(() => {
    if (restartSignalRef.current === restartSignal) return;
    restartSignalRef.current = restartSignal;
    void runProject("repair-retry");
  }, [restartSignal, runProject]);

  function stopProject() {
    runIdRef.current += 1;
    processRef.current?.kill();
    processRef.current = null;
    if (serverTimeoutRef.current !== null) window.clearTimeout(serverTimeoutRef.current);
    serverTimeoutRef.current = null;
    serverUnsubscribeRef.current?.();
    serverUnsubscribeRef.current = null;
    if (repairTimerRef.current !== null) window.clearTimeout(repairTimerRef.current);
    repairTimerRef.current = null;
    updateStatus("stopped");
    setPreviewUrl(null);
    appendOutput("\nProcess stopped.\n");
  }

  const running = status === "booting" || status === "installing" || status === "starting" || status === "ready" || status === "repairing";
  const startScript = manifest && manifest !== "invalid"
    ? manifest.scripts?.dev ? "dev" : manifest.scripts?.start ? "start" : "dev"
    : "dev";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-panel/30">
      <div className="flex min-h-[42px] flex-wrap items-center gap-2 border-b border-line bg-panel/60 px-3 py-2">
        <span className={`h-2 w-2 rounded-full ${status === "ready" ? "bg-[#8bc9a2]" : status === "error" ? "bg-ember" : running ? "animate-pulse bg-[#d5bdff]" : "bg-muted-dim"}`} />
        <span className="text-[11px] text-cream-soft">{STATUS_LABEL[status]}</span>
        {status === "repairing" ? <span className="font-mono text-[10px] text-[#d9c8ff]">{repairAttempt}/{MAX_AUTO_REPAIRS}</span> : null}
        <span className="hidden text-[10px] text-muted-dim sm:inline">· WebContainer · browser only</span>
        <div className="ml-auto flex items-center gap-1.5">
          {previewUrl ? (
            <a href={previewUrl} target="_blank" rel="noreferrer" className="grid h-7 w-7 place-items-center rounded border border-line text-muted hover:text-cream" title="Open preview in a new tab" aria-label="Open preview in a new tab">
              <ExternalLink size={12} />
            </a>
          ) : null}
          {status === "repairing" ? (
            <span className="flex h-7 items-center gap-1.5 rounded border border-[#c9afff]/20 px-2 text-[10.5px] text-[#d9c8ff]">Kite is fixing…</span>
          ) : running ? (
            <button type="button" onClick={stopProject} className="flex h-7 items-center gap-1.5 rounded border border-line px-2 text-[10.5px] text-muted hover:text-cream">
              <Square size={11} /> Stop
            </button>
          ) : (
            <button type="button" disabled={agentBusy} onClick={() => void runProject()} className="flex h-7 items-center gap-1.5 rounded-md bg-[#d6c4ff] px-2.5 text-[10.5px] font-medium text-[#21162e] transition hover:bg-white disabled:cursor-wait disabled:opacity-50">
              <Play size={11} /> Run
            </button>
          )}
        </div>
      </div>

      {previewUrl ? (
        <iframe
          key={previewUrl}
          title="Running project preview"
          src={previewUrl}
          allow="cross-origin-isolated"
          className="min-h-[180px] w-full flex-1 bg-white"
        />
      ) : (
        <div className="flex min-h-[180px] flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          {status === "error" ? <Alert size={18} className="text-ember" /> : <Play size={18} className="text-[#d6c4ff]" />}
          <p className="max-w-[44ch] text-[12px] leading-relaxed text-muted">
            {status === "error"
              ? "The run stopped before a preview was ready. Open the terminal below for the npm or compile error."
              : "Run this project to install its npm packages and open the live development preview."}
          </p>
        </div>
      )}

      <section className={`flex min-h-[46px] shrink-0 flex-col border-t border-line bg-[#11100f] ${terminalOpen ? "h-[230px]" : "h-[46px]"}`}>
        <div className="flex h-[45px] shrink-0 items-center gap-2 border-b border-line px-3">
          <button type="button" onClick={() => setTerminalOpen((open) => !open)} className="flex items-center gap-2 text-[10px] uppercase tracking-[0.13em] text-muted hover:text-cream">
            <Terminal size={12} /> Terminal
            {errorCount > 0 ? <span className="rounded-full bg-ember/15 px-1.5 py-0.5 font-mono text-[9px] text-[#efa88f]">{errorCount} errors</span> : null}
          </button>
          <span className="ml-auto text-[10px] text-muted-dim">npm install · npm run {startScript}</span>
          {errorCount > 0 ? (
            <button
              type="button"
              disabled={agentBusy}
              onClick={() => onFixErrors(terminalOutput.slice(-12_000))}
              className="rounded-md border border-[#c9afff]/25 bg-[#b69aff]/10 px-2 py-1 text-[10px] text-[#d9c8ff] transition hover:bg-[#b69aff]/20 disabled:opacity-50"
            >
              {agentBusy ? "Kite is working…" : "Ask Kite to fix"}
            </button>
          ) : null}
          <button type="button" onClick={() => replaceOutput("")} className="text-[10px] text-muted-dim hover:text-cream">Clear</button>
        </div>
        {terminalOpen ? (
          <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words px-3 py-2.5 font-mono text-[10.5px] leading-[1.65] text-[#b9b2a8]">
            {terminalOutput || <span className="text-muted-dim">Terminal output will appear here.</span>}
          </pre>
        ) : null}
      </section>
    </div>
  );
}
