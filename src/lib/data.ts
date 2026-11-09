import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { messages as messagesTable, projects, workspaceFiles } from "@/db/schema";
import type {
  ChatMessage,
  FileOp,
  MessageMeta,
  Project,
  ProjectDetail,
  WorkspaceFile,
} from "@/lib/types";
import type { ProjectPlan } from "./agent/project-generator";
import { removeFileObject, storageInfo, uploadFile } from "@/lib/storage";
import { composeEdit, composeProject, detectStack } from "./agent/compose";
import { geminiConfigured } from "./agent/gemini";
import { QuotaError, reserveGeminiRequest, settleGeminiRequest } from "./agent/limiter";
import { ENGINE_DISPLAY_NAME } from "./engine-labels";
import {
  BATCH_OUTPUT_TOKENS,
  BATCH_SIZE,
  FILE_OUTPUT_TOKENS,
  PLAN_OUTPUT_TOKENS,
  prepareProjectFile,
  prepareProjectFiles,
  prepareProjectPlan,
  requestProjectFile,
  requestProjectFiles,
  requestProjectPlan,
} from "./agent/project-generator";

const iso = (value: Date | string) => (value instanceof Date ? value.toISOString() : value);

type ProjectRow = typeof projects.$inferSelect;
type FileRow = typeof workspaceFiles.$inferSelect;
type MessageRow = typeof messagesTable.$inferSelect;
type MeteredResponse = { usage: { totalTokens: number } };

async function withReservedModelRequest<T extends MeteredResponse>(
  ownerId: string,
  estimatedInputTokens: number,
  outputTokenBudget: number,
  request: () => Promise<T>,
) {
  const reservation = await reserveGeminiRequest(ownerId, estimatedInputTokens, outputTokenBudget);
  if (!reservation.ok) throw new QuotaError(reservation);

  let result: T;
  try {
    result = await request();
  } catch (error) {
    await settleGeminiRequest(reservation.eventId, false, estimatedInputTokens);
    throw error;
  }

  await settleGeminiRequest(
    reservation.eventId,
    true,
    result.usage.totalTokens || estimatedInputTokens,
  );
  return result;
}

function toProject(row: ProjectRow, fileCount: number): Project {
  return {
    id: row.id,
    name: row.name,
    prompt: row.prompt,
    summary: row.summary,
    stack: row.stack,
    status: row.status,
    provider: row.provider === "local-engine" ? "local-engine" : "opal",
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    fileCount,
  };
}

function toFile(row: FileRow): WorkspaceFile {
  return {
    id: row.id,
    path: row.path,
    name: row.name,
    kind: row.kind === "folder" ? "folder" : "file",
    language: row.language,
    content: row.content,
    storagePath: row.storagePath,
    updatedAt: iso(row.updatedAt),
  };
}

function toMessage(row: MessageRow): ChatMessage {
  const storedMeta = (row.meta as MessageMeta | null) ?? null;
  const isLocal = storedMeta?.provider === "local-engine" || storedMeta?.model === "kite-composer-v1";
  const allowedNotes = new Set([
    "Files mirrored to Supabase Storage",
    "Plan only — no files were written",
    "The connected model did not respond. Kite completed this run with its local composer.",
  ]);
  const meta = storedMeta
    ? {
        ...storedMeta,
        provider: isLocal ? "local-engine" : "opal",
        model: isLocal ? "Kite local composer" : ENGINE_DISPLAY_NAME,
        note: storedMeta.note && allowedNotes.has(storedMeta.note) ? storedMeta.note : undefined,
      }
    : null;
  return {
    id: row.id,
    role: row.role === "user" ? "user" : "agent",
    content: row.content,
    kind: (row.kind as ChatMessage["kind"]) ?? "text",
    meta,
    createdAt: iso(row.createdAt),
  };
}

export async function listProjects(ownerId: string): Promise<Project[]> {
  const rows = await db.select().from(projects).where(eq(projects.ownerId, ownerId)).orderBy(sql`${projects.updatedAt} desc`);
  if (rows.length === 0) return [];

  const counts = await db
    .select({ projectId: workspaceFiles.projectId, count: sql<number>`count(*)::int` })
    .from(workspaceFiles)
    .where(and(eq(workspaceFiles.kind, "file"), inArray(workspaceFiles.projectId, rows.map((row) => row.id))))
    .groupBy(workspaceFiles.projectId);

  const map = new Map(counts.map((c) => [c.projectId, Number(c.count)]));
  return rows.map((row) => toProject(row, map.get(row.id) ?? 0));
}

export async function getProjectDetail(projectId: string, ownerId: string): Promise<ProjectDetail | null> {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)))
    .limit(1);
  if (!project) return null;

  const [files, msgs] = await Promise.all([
    db
      .select()
      .from(workspaceFiles)
      .where(eq(workspaceFiles.projectId, projectId))
      .orderBy(asc(workspaceFiles.path)),
    db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.projectId, projectId))
      .orderBy(asc(messagesTable.seq)),
  ]);

  return {
    project: toProject(project, files.filter((f) => f.kind === "file").length),
    files: files.map(toFile),
    messages: msgs.map(toMessage),
  };
}

function languageFromPath(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    html: "html",
    htm: "html",
    css: "css",
    js: "javascript",
    mjs: "javascript",
    ts: "typescript",
    tsx: "typescript",
    jsx: "javascript",
    json: "json",
    md: "markdown",
    py: "python",
    txt: "plaintext",
    yml: "yaml",
    yaml: "yaml",
    sql: "sql",
    svg: "svg",
    env: "plaintext",
  };
  return map[ext] ?? "plaintext";
}

function normalizeWorkspacePath(rawPath: string) {
  const path = rawPath.trim().replace(/\\/g, "/");
  const parts = path.split("/");
  if (
    !path ||
    path.length > 240 ||
    path.startsWith("/") ||
    parts.some((part) => !part || part === "." || part === "..") ||
    /[\u0000-\u001f]/.test(path)
  ) {
    throw new Error("Use a valid relative file path.");
  }
  return parts.join("/");
}

export type AgentRunOutcome = {
  detail: ProjectDetail;
  reply: string;
  plan: string[];
  files: FileOp[];
  provider: string;
  note?: string;
};

/**
 * Runs one agent turn: plans, writes files into the workspace, mirrors them to
 * storage and records the conversation. The configured model is used when available,
 * otherwise the built-in composer handles the request.
 */
export async function runAgent(
  projectId: string,
  ownerId: string,
  prompt: string,
  options: { planOnly?: boolean } = {},
): Promise<AgentRunOutcome | null> {
  const detail = await getProjectDetail(projectId, ownerId);
  if (!detail) return null;

  const existing = detail.files;
  const isEdit = existing.some((file) => file.kind === "file");
  const startedAt = Date.now();
  const storage = storageInfo();

  if (options.planOnly) {
    const plan = isEdit
      ? composeEdit(existing, prompt).plan
      : composeProject(prompt, detectStack(prompt)).plan;
    const reply = `Here's how I'd approach this. Nothing has been written yet — switch to Build and send again (or just say “go ahead”) and I'll create the files.\n\n${plan
      .map((step, index) => `${index + 1}. ${step}`)
      .join("\n")}`;

    await db.insert(messagesTable).values({ projectId, role: "user", content: prompt, kind: "text" });
    await db.insert(messagesTable).values({
      projectId,
      role: "agent",
      content: reply,
      kind: "plan",
      meta: {
        plan,
        files: [],
        provider: "local-engine",
        model: "kite-composer-v1",
        durationMs: Date.now() - startedAt,
        note: "Plan only — no files were written",
      } satisfies MessageMeta,
    });

    await db
      .update(projects)
      .set({ provider: "local-engine", status: "ready", updatedAt: new Date() })
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)));
    const updated = await getProjectDetail(projectId, ownerId);
    if (!updated) return null;
    return {
      detail: updated,
      reply,
      plan,
      files: [],
      provider: "local-engine",
      note: "Plan only",
    };
  }

  let provider = "local-engine";
  let note: string | undefined;
  let reply = "";
  let plan: string[] = [];
  let generated: Array<{ path: string; content: string; language: string }> = [];
  let name: string | undefined;
  let summary: string | undefined;
  let stack: string | undefined;
  let pendingBuildForSave: MessageMeta["pendingBuild"];

  const modelConfigured = geminiConfigured();
  if (modelConfigured) {
    const originalBrief = detail.project.prompt || prompt;
    const previousAgentMessage = [...detail.messages].reverse().find((message) => message.role === "agent");
    const pendingBuild = previousAgentMessage?.meta?.pendingBuild;
    const resumableBuild = pendingBuild?.remaining.length ? pendingBuild : null;
    let projectPlan: ProjectPlan;
    if (resumableBuild) {
      projectPlan = {
        name: resumableBuild.name,
        summary: resumableBuild.summary,
        stack: resumableBuild.stack,
        reply: "",
        files: resumableBuild.remaining,
        filesLimited: false,
        usage: { totalTokens: 0 },
      };
    } else {
      const planPrompt = prepareProjectPlan({ request: prompt, originalBrief, existingFiles: existing });
      projectPlan = await withReservedModelRequest(
        ownerId,
        planPrompt.estimatedInputTokens,
        PLAN_OUTPUT_TOKENS,
        () => requestProjectPlan(planPrompt),
      );
    }
    const projectManifest = resumableBuild?.manifest ?? projectPlan.files;

    provider = "opal";
    name = projectPlan.name;
    summary = projectPlan.summary;
    stack = projectPlan.stack;
    plan = projectPlan.files.map((file) => `Create ${file.path} (${file.language}) — ${file.purpose}`);

    let pauseReason = "";
    let unresolvedFile: (typeof projectPlan.files)[number] | null = null;
    for (let offset = 0; offset < projectPlan.files.length; offset += BATCH_SIZE) {
      const group = projectPlan.files.slice(offset, offset + BATCH_SIZE);
      const preparedBatch = prepareProjectFiles({
        request: prompt,
        originalBrief,
        projectName: projectPlan.name,
        summary: projectPlan.summary,
        stack: projectPlan.stack,
        manifest: projectManifest,
        files: group,
        existingFiles: existing,
      });
      let batchFiles: Array<{ path: string; language: string; content: string }> = [];
      try {
        const batch = await withReservedModelRequest(
          ownerId,
          preparedBatch.estimatedInputTokens,
          BATCH_OUTPUT_TOKENS,
          () => requestProjectFiles(preparedBatch, group),
        );
        batchFiles = batch.files;
      } catch (error) {
        if (error instanceof QuotaError) {
          if (resumableBuild && generated.length === 0) throw error;
          pauseReason = "The shared request allowance is full.";
        } else if (error instanceof Error && error.message === "GEMINI_RATE_LIMITED") {
          if (resumableBuild && generated.length === 0) throw error;
          pauseReason = "The model is temporarily rate limited.";
        } else if (error instanceof Error && error.message.startsWith("MODEL_")) {
          // A malformed or oversized batch is recovered with individual, plain-text file requests below.
        } else {
          throw error;
        }
      }
      if (pauseReason) break;
      generated.push(...batchFiles);

      const completedPaths = new Set(batchFiles.map((file) => file.path));
      const missingFiles = group.filter((file) => !completedPaths.has(file.path));
      for (const target of missingFiles) {
        const prepared = prepareProjectFile({
          request: prompt,
          originalBrief,
          projectName: projectPlan.name,
          summary: projectPlan.summary,
          stack: projectPlan.stack,
          manifest: projectManifest,
          file: target,
          existingFiles: existing,
        });
        try {
          let file: Awaited<ReturnType<typeof requestProjectFile>> | null = null;
          for (let attempt = 0; attempt < 2 && !file; attempt += 1) {
            try {
              file = await withReservedModelRequest(
                ownerId,
                prepared.estimatedInputTokens,
                FILE_OUTPUT_TOKENS,
                () => requestProjectFile(prepared, target),
              );
            } catch (error) {
              if (error instanceof QuotaError || (error instanceof Error && error.message === "GEMINI_RATE_LIMITED")) {
                throw error;
              }
              if (!(error instanceof Error) || !error.message.startsWith("MODEL_")) throw error;
              if (attempt === 1) throw error;
            }
          }
          if (!file) throw new Error("MODEL_INVALID_FILE");
          generated.push({ path: file.path, content: file.content, language: file.language });
        } catch (error) {
          if (error instanceof QuotaError) {
            if (resumableBuild && generated.length === 0) throw error;
            pauseReason = "The shared request allowance is full.";
          } else if (error instanceof Error && error.message === "GEMINI_RATE_LIMITED") {
            if (resumableBuild && generated.length === 0) throw error;
            pauseReason = "The model is temporarily rate limited.";
          } else if (error instanceof Error && error.message.startsWith("MODEL_")) {
            unresolvedFile = target;
            pauseReason = "I need one detail before I can finish the remaining piece.";
          } else {
            throw error;
          }
          break;
        }
      }
      if (pauseReason) break;
    }

    const generatedPaths = new Set(generated.map((file) => file.path));
    const remainingFiles = projectPlan.files.filter((file) => !generatedPaths.has(file.path));
    const nextPendingBuild = remainingFiles.length
      ? {
          name: projectPlan.name,
          summary: projectPlan.summary,
          stack: projectPlan.stack,
          manifest: projectManifest,
          remaining: remainingFiles,
        }
      : undefined;
    pendingBuildForSave = nextPendingBuild;
    const completedFileCount = projectManifest.length - remainingFiles.length;

    if (generated.length < projectPlan.files.length) {
      note = unresolvedFile
        ? `I saved ${completedFileCount} of ${projectManifest.length} files and kept the remaining plan. For ${unresolvedFile.path}, should I keep it simple, make it easier to extend, or add more polish? I’ll use balanced defaults if you don’t have a preference.`
        : `I saved ${completedFileCount} of ${projectManifest.length} files and kept the remaining plan. For the rest, should I prioritize simplicity, flexibility, or extra polish? I’ll use a balanced default if you want me to keep going.`;
      reply = note;
    } else if (projectPlan.filesLimited) {
      note = `Created the first ${generated.length} files. What should I prioritize in the next set?`;
      reply = note;
    } else {
      reply = projectPlan.reply || `Built ${projectPlan.name} with ${generated.length} files.`;
    }
  } else {
    if (isEdit) {
      const edit = composeEdit(existing, prompt);
      reply = edit.reply;
      plan = edit.plan;
      generated = edit.changes;
    } else {
      const build = composeProject(prompt, detectStack(prompt));
      reply = build.reply;
      plan = build.plan;
      generated = build.files;
      name = build.name;
      summary = build.summary;
      stack = build.stack;
    }
  }

  await db.insert(messagesTable).values({ projectId, role: "user", content: prompt, kind: "text" });

  const currentPaths = new Map(existing.map((file) => [file.path, file]));
  const ops: FileOp[] = [];

  for (const file of generated) {
    const previous = currentPaths.get(file.path);
    const language = file.language || languageFromPath(file.path);
    const storageResult = await uploadFile({
      projectId,
      path: file.path,
      content: file.content,
      language,
    });

    await db
      .insert(workspaceFiles)
      .values({
        projectId,
        path: file.path,
        name: file.path.split("/").pop() ?? file.path,
        kind: "file",
        language,
        content: file.content,
        storagePath: storageResult.storagePath,
      })
      .onConflictDoUpdate({
        target: [workspaceFiles.projectId, workspaceFiles.path],
        set: {
          content: file.content,
          language,
          storagePath: storageResult.storagePath,
          updatedAt: new Date(),
        },
      });

    ops.push({
      action: previous ? (previous.content === file.content ? "unchanged" : "updated") : "created",
      path: file.path,
      language,
    });
  }

  const meta: MessageMeta = {
    plan,
    files: ops,
    provider,
    model: provider === "opal" ? ENGINE_DISPLAY_NAME : "kite-composer-v1",
    durationMs: Date.now() - startedAt,
    note: note ?? (storage.provider === "supabase" ? "Files mirrored to Supabase Storage" : undefined),
    ...(pendingBuildForSave ? { pendingBuild: pendingBuildForSave } : {}),
  };

  await db.insert(messagesTable).values({
    projectId,
    role: "agent",
    content: reply,
    kind: "files",
    meta,
  });

  await db
    .update(projects)
    .set({
      ...(name && !isEdit ? { name } : {}),
      ...(summary && !isEdit ? { summary } : {}),
      ...(stack ? { stack } : {}),
      provider,
      status: "ready",
      updatedAt: new Date(),
    })
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)));

  const updated = await getProjectDetail(projectId, ownerId);
  if (!updated) return null;

  return {
    detail: updated,
    reply,
    plan,
    files: ops,
    provider,
    note,
  };
}

export async function createProject(prompt: string, ownerId: string, planOnly = false) {
  const stack = detectStack(prompt);
  const draft = composeProject(prompt, stack);

  const [created] = await db
    .insert(projects)
    .values({
      name: draft.name,
      ownerId,
      prompt,
      summary: draft.summary,
      stack: draft.stack,
      status: "building",
    })
    .returning();

  try {
    return await runAgent(created.id, ownerId, prompt, { planOnly });
  } catch (error) {
    await db.delete(projects).where(and(eq(projects.id, created.id), eq(projects.ownerId, ownerId)));
    throw error;
  }
}

export async function deleteProject(projectId: string, ownerId: string) {
  const project = await getProjectDetail(projectId, ownerId);
  if (!project) return false;
  const files = await db
    .select({ path: workspaceFiles.path })
    .from(workspaceFiles)
    .where(eq(workspaceFiles.projectId, projectId));

  await Promise.all(files.map((file) => removeFileObject(projectId, file.path)));
  await db.delete(projects).where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)));
  return true;
}

export async function createWorkspaceFile(input: {
  projectId: string;
  path: string;
  kind: "file" | "folder";
  content?: string;
}) {
  const cleanPath = normalizeWorkspacePath(input.path);
  const content = input.kind === "file" ? (input.content ?? "") : "";
  if (content.length > 500_000) throw new Error("Keep each file under 500,000 characters.");

  const language = input.kind === "file" ? languageFromPath(cleanPath) : "plaintext";
  const name = cleanPath.split("/").pop() ?? cleanPath;

  const [row] = await db
    .insert(workspaceFiles)
    .values({
      projectId: input.projectId,
      path: cleanPath,
      name,
      kind: input.kind,
      language,
      content,
    })
    .onConflictDoUpdate({
      target: [workspaceFiles.projectId, workspaceFiles.path],
      set: { updatedAt: new Date() },
    })
    .returning();

  if (input.kind === "file") {
    const stored = await uploadFile({
      projectId: input.projectId,
      path: cleanPath,
      content,
      language,
    });
    if (stored.storagePath) {
      await db
        .update(workspaceFiles)
        .set({ storagePath: stored.storagePath })
        .where(eq(workspaceFiles.id, row.id));
    }
  }

  await db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, input.projectId));
  return toFile(row);
}

export async function updateWorkspaceFile(
  projectId: string,
  fileId: string,
  patch: { content?: string; path?: string },
) {
  const [existing] = await db
    .select()
    .from(workspaceFiles)
    .where(and(eq(workspaceFiles.id, fileId), eq(workspaceFiles.projectId, projectId)))
    .limit(1);
  if (!existing) return null;

  const nextPath = patch.path ? normalizeWorkspacePath(patch.path) : existing.path;
  const nextLanguage = patch.path ? languageFromPath(nextPath) : existing.language;
  const nextContent = patch.content ?? existing.content;
  if (nextContent.length > 500_000) throw new Error("Keep each file under 500,000 characters.");

  const [updated] = await db
    .update(workspaceFiles)
    .set({
      path: nextPath,
      name: nextPath.split("/").pop() ?? nextPath,
      language: nextLanguage,
      content: nextContent,
      updatedAt: new Date(),
    })
    .where(eq(workspaceFiles.id, fileId))
    .returning();

  if (existing.kind === "file") {
    const stored = await uploadFile({
      projectId,
      path: nextPath,
      content: nextContent,
      language: nextLanguage,
    });
    if (stored.storagePath) {
      await db
        .update(workspaceFiles)
        .set({ storagePath: stored.storagePath })
        .where(eq(workspaceFiles.id, fileId));
    }
    if (nextPath !== existing.path) await removeFileObject(projectId, existing.path);
  }

  await db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, projectId));
  return toFile(updated);
}

export async function deleteWorkspaceFiles(projectId: string, ids: string[]) {
  if (ids.length === 0) return;
  const rows = await db
    .select({ path: workspaceFiles.path, kind: workspaceFiles.kind })
    .from(workspaceFiles)
    .where(and(eq(workspaceFiles.projectId, projectId), inArray(workspaceFiles.id, ids)));

  await db
    .delete(workspaceFiles)
    .where(and(eq(workspaceFiles.projectId, projectId), inArray(workspaceFiles.id, ids)));

  await Promise.all(
    rows.filter((row) => row.kind === "file").map((row) => removeFileObject(projectId, row.path)),
  );
  await db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, projectId));
}
