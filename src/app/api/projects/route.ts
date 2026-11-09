import { createProject, listProjects } from "@/lib/data";
import { getAuthenticatedUser, unauthorized } from "@/lib/auth/server";
import { DAILY_LIMIT_RPD, getCreditSnapshot, getQuotaSnapshot, QuotaError, RATE_LIMIT_RPM, TOKEN_LIMIT_TPM } from "@/lib/agent/limiter";
import { geminiConfigured } from "@/lib/agent/gemini";
import { ENGINE_DISPLAY_NAME, LOCAL_ENGINE_DISPLAY_NAME } from "@/lib/engine-labels";
import { storageInfo } from "@/lib/storage";
import type { EngineConfig } from "@/lib/types";
import { databaseConfigured, databaseSetupResponse } from "@/db";
import { safeApiFailure } from "@/lib/server-errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!databaseConfigured) return databaseSetupResponse();
  const user = await getAuthenticatedUser(request);
  if (!user) return unauthorized();
  try {
    const [projects, quota, credits] = await Promise.all([
      listProjects(user.id),
      getQuotaSnapshot(),
      getCreditSnapshot(user.id),
    ]);
    const configured = geminiConfigured();
    const config: EngineConfig = {
      provider: configured ? "opal" : "local-engine",
      configured,
      model: configured ? ENGINE_DISPLAY_NAME : LOCAL_ENGINE_DISPLAY_NAME,
      rpm: RATE_LIMIT_RPM,
      tpm: TOKEN_LIMIT_TPM,
      rpd: DAILY_LIMIT_RPD,
      storage: storageInfo(),
      hint: configured ? `${ENGINE_DISPLAY_NAME} is ready.` : "Kite's local composer is ready.",
    };
    return Response.json({ projects, rate: quota.rate, quota, credits, config, user: { email: user.email } });
  } catch (error) {
    return safeApiFailure(error, "Could not load your projects.");
  }
}

export async function POST(request: Request) {
  if (!databaseConfigured) return databaseSetupResponse();
  const user = await getAuthenticatedUser(request);
  if (!user) return unauthorized();
  let prompt = "";
  let planOnly = false;
  try {
    const body = (await request.json()) as { prompt?: string; planOnly?: boolean };
    prompt = (body.prompt ?? "").trim();
    planOnly = Boolean(body.planOnly);
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (prompt.length < 3) {
    return Response.json({ error: "Describe what you want built." }, { status: 400 });
  }
  if (prompt.length > 40_000) return Response.json({ error: "Keep the build brief under 40,000 characters." }, { status: 413 });

  try {
    const outcome = await createProject(prompt, user.id, planOnly);
    if (!outcome) return Response.json({ error: "Could not create project" }, { status: 500 });
    const [quota, credits] = await Promise.all([getQuotaSnapshot(), getCreditSnapshot(user.id)]);
    return Response.json({ detail: outcome.detail, rate: quota.rate, quota, credits, provider: outcome.provider });
  } catch (error) {
    if (error instanceof Error && error.message === "GEMINI_RATE_LIMITED") {
      const retryAfterMs = (error as Error & { retryAfterMs?: number }).retryAfterMs ?? 60_000;
      try {
        const [quota, credits] = await Promise.all([getQuotaSnapshot(), getCreditSnapshot(user.id)]);
        return Response.json(
          { error: "rate_limited", message: "The request limit is reached — Kite is thinking and will retry.", retryAfterMs, rate: quota.rate, quota, credits },
          { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
        );
      } catch (snapshotError) {
        return safeApiFailure(snapshotError, "The request limit is reached. Wait briefly and try again.");
      }
    }
    if (error instanceof QuotaError) {
      const status = error.code === "credits_exhausted" ? 402 : error.code === "prompt_too_large" ? 413 : 429;
      return Response.json(
        { error: error.code, message: error.message, retryAfterMs: error.retryAfterMs, rate: error.quota.rate, quota: error.quota, credits: error.credits },
        { status, headers: error.retryAfterMs ? { "Retry-After": String(Math.ceil(error.retryAfterMs / 1000)) } : undefined },
      );
    }
    return safeApiFailure(error, "Could not create the project.");
  }
}
