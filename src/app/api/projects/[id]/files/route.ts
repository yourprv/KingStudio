import { createWorkspaceFile, getProjectDetail } from "@/lib/data";
import { getAuthenticatedUser, unauthorized } from "@/lib/auth/server";
import { databaseConfigured, databaseSetupResponse } from "@/db";
import { safeApiFailure } from "@/lib/server-errors";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  if (!databaseConfigured) return databaseSetupResponse();
  const user = await getAuthenticatedUser(request);
  if (!user) return unauthorized();
  const { id } = await params;
  let body: { path?: string; kind?: "file" | "folder"; content?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const path = (body.path ?? "").trim();
  if (!path) return Response.json({ error: "A path is required" }, { status: 400 });

  try {
    if (!(await getProjectDetail(id, user.id))) return Response.json({ error: "Project not found" }, { status: 404 });
    const file = await createWorkspaceFile({
      projectId: id,
      path,
      kind: body.kind === "folder" ? "folder" : "file",
      content: body.content ?? "",
    });
    return Response.json({ file }, { status: 201 });
  } catch (error) {
    return safeApiFailure(error, "Could not create the file.");
  }
}

/** Bulk upload endpoint — used by "import files" in the workspace. */
export async function PUT(request: Request, { params }: Params) {
  if (!databaseConfigured) return databaseSetupResponse();
  const user = await getAuthenticatedUser(request);
  if (!user) return unauthorized();
  const { id } = await params;
  let body: { files?: Array<{ path: string; content: string; language?: string }> };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const files = body.files ?? [];
  if (!Array.isArray(files) || files.length === 0) return Response.json({ error: "No files provided" }, { status: 400 });
  if (files.length > 60 || files.some((file) => !file || typeof file.path !== "string" || typeof file.content !== "string")) {
    return Response.json({ error: "Upload up to 60 valid files at a time." }, { status: 400 });
  }
  if (files.reduce((total, file) => total + file.content.length, 0) > 2_000_000) {
    return Response.json({ error: "Keep each upload under 2,000,000 characters in total." }, { status: 413 });
  }

  try {
    if (!(await getProjectDetail(id, user.id))) return Response.json({ error: "Project not found" }, { status: 404 });
    const created = [];
    for (const file of files) {
      const row = await createWorkspaceFile({
        projectId: id,
        path: file.path,
        kind: "file",
        content: file.content,
      });
      created.push(row);
    }
    return Response.json({ files: created }, { status: 201 });
  } catch (error) {
    return safeApiFailure(error, "Could not import the files.");
  }
}
