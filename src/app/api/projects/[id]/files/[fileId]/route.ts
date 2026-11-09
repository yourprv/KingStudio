import { deleteWorkspaceFiles, getProjectDetail, updateWorkspaceFile } from "@/lib/data";
import { getAuthenticatedUser, unauthorized } from "@/lib/auth/server";
import { databaseConfigured, databaseSetupResponse } from "@/db";
import { safeApiFailure } from "@/lib/server-errors";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; fileId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  if (!databaseConfigured) return databaseSetupResponse();
  const user = await getAuthenticatedUser(request);
  if (!user) return unauthorized();
  const { id, fileId } = await params;
  let body: { content?: string; path?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.content !== "string" && typeof body.path !== "string") {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }
  if (typeof body.content === "string" && body.content.length > 500_000) {
    return Response.json({ error: "Keep each file under 500,000 characters." }, { status: 413 });
  }

  try {
    if (!(await getProjectDetail(id, user.id))) return Response.json({ error: "Project not found" }, { status: 404 });
    const file = await updateWorkspaceFile(id, fileId, body);
    if (!file) return Response.json({ error: "File not found" }, { status: 404 });
    return Response.json({ file });
  } catch (error) {
    return safeApiFailure(error, "Could not update this file.");
  }
}

export async function DELETE(request: Request, { params }: Params) {
  if (!databaseConfigured) return databaseSetupResponse();
  const user = await getAuthenticatedUser(request);
  if (!user) return unauthorized();
  const { id, fileId } = await params;
  try {
    if (!(await getProjectDetail(id, user.id))) return Response.json({ error: "Project not found" }, { status: 404 });
    await deleteWorkspaceFiles(id, [fileId]);
    return Response.json({ ok: true });
  } catch (error) {
    return safeApiFailure(error, "Could not delete this file.");
  }
}
