import { deleteProject, getProjectDetail } from "@/lib/data";
import { getAuthenticatedUser, unauthorized } from "@/lib/auth/server";
import { databaseConfigured, databaseSetupResponse } from "@/db";
import { safeApiFailure } from "@/lib/server-errors";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  if (!databaseConfigured) return databaseSetupResponse();
  const user = await getAuthenticatedUser(request);
  if (!user) return unauthorized();
  const { id } = await params;
  try {
    const detail = await getProjectDetail(id, user.id);
    if (!detail) return Response.json({ error: "Project not found" }, { status: 404 });
    return Response.json({ detail });
  } catch (error) {
    return safeApiFailure(error, "Could not load this project.");
  }
}

export async function DELETE(request: Request, { params }: Params) {
  if (!databaseConfigured) return databaseSetupResponse();
  const user = await getAuthenticatedUser(request);
  if (!user) return unauthorized();
  const { id } = await params;
  try {
    const detail = await getProjectDetail(id, user.id);
    if (!detail) return Response.json({ error: "Project not found" }, { status: 404 });
    await deleteProject(id, user.id);
    return Response.json({ ok: true });
  } catch (error) {
    return safeApiFailure(error, "Could not delete this project.");
  }
}
