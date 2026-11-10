import { getAuthenticatedUser, unauthorized } from "@/lib/auth/server";
import { getCreditSnapshot, getQuotaSnapshot, QuotaError } from "@/lib/agent/limiter";
import { getProjectDetail, runAgent } from "@/lib/data";
import { databaseConfigured, databaseSetupResponse } from "@/db";
import { safeApiFailure } from "@/lib/server-errors";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  if (!databaseConfigured) return databaseSetupResponse();
  const user = await getAuthenticatedUser(request);
  if (!user) return unauthorized();
  const { id } = await params;

  let prompt = "";
  let planOnly = false;
  try {
    const body = (await request.json()) as { prompt?: string; planOnly?: boolean };
    prompt = (body.prompt ?? "").trim();
    planOnly = Boolean(body.planOnly);
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (prompt.length < 2) {
    return Response.json({ error: "Tell the agent what to change or build." }, { status: 400 });
  }
  if (prompt.length > 40_000) return Response.json({ error: "Keep the change request under 40,000 characters." }, { status: 413 });

  try {
    const project = await getProjectDetail(id, user.id);
    if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

    const outcome = await runAgent(id, user.id, prompt, { planOnly, tier: user.tier });
    if (!outcome) return Response.json({ error: "Agent run failed" }, { status: 500 });
    const [quota, credits] = await Promise.all([getQuotaSnapshot(user.id, user.tier), getCreditSnapshot(user.id, user.tier)]);
    return Response.json({
      detail: outcome.detail,
      rate: quota.rate,
      quota,
      credits,
      provider: outcome.provider,
      note: outcome.note,
    });
  } catch (error) {
    const err = error as Error & { retryAfterMs?: number };
    if (error instanceof QuotaError) {
      const status = error.code === "credits_exhausted" ? 402 : error.code === "prompt_too_large" ? 413 : 429;
      return Response.json(
        { error: error.code, message: error.message, retryAfterMs: error.retryAfterMs, rate: error.quota.rate, quota: error.quota, credits: error.credits },
        { status, headers: error.retryAfterMs ? { "Retry-After": String(Math.ceil(error.retryAfterMs / 1000)) } : undefined },
      );
    }
    if (err.message === "GEMINI_RATE_LIMITED") {
      try {
        const [quota, credits] = await Promise.all([getQuotaSnapshot(user.id, user.tier), getCreditSnapshot(user.id, user.tier)]);
        return Response.json(
          {
            error: "rate_limited",
            message: "The request limit is reached — Kite is thinking and will retry.",
            retryAfterMs: err.retryAfterMs ?? 20_000,
            rate: quota.rate,
            quota,
            credits,
          },
          { status: 429 },
        );
      } catch (snapshotError) {
        return safeApiFailure(snapshotError, "The request limit is reached. Wait briefly and try again.");
      }
    }
    return safeApiFailure(error, "Could not run the build. Check the database setup and try again.");
  }
}
