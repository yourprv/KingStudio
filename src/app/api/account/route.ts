import { getAuthenticatedUser, unauthorized } from "@/lib/auth/server";
import { getCreditSnapshot, getQuotaSnapshot } from "@/lib/agent/limiter";
import { databaseConfigured, databaseSetupResponse } from "@/db";
import { safeApiFailure } from "@/lib/server-errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!databaseConfigured) return databaseSetupResponse();
  const user = await getAuthenticatedUser(request);
  if (!user) return unauthorized();

  try {
    const [credits, quota] = await Promise.all([
      getCreditSnapshot(user.id, user.tier),
      getQuotaSnapshot(user.id, user.tier),
    ]);
    return Response.json({ user: { id: user.id, email: user.email, tier: user.tier }, credits, quota });
  } catch (error) {
    return safeApiFailure(error, "Could not load account credits.");
  }
}
