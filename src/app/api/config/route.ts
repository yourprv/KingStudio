import { geminiConfigured } from "@/lib/agent/gemini";
import { ENGINE_DISPLAY_NAME, LOCAL_ENGINE_DISPLAY_NAME } from "@/lib/engine-labels";
import { getQuotaSnapshot, TIER_LIMITS } from "@/lib/agent/limiter";
import { getAuthenticatedUser, unauthorized } from "@/lib/auth/server";
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
    const storage = storageInfo();
    const configured = geminiConfigured();
    const limits = TIER_LIMITS[user.tier];
    const config: EngineConfig = {
      provider: configured ? "opal" : "local-engine",
      configured,
      model: configured ? ENGINE_DISPLAY_NAME : LOCAL_ENGINE_DISPLAY_NAME,
      rpm: limits.rpm,
      tpm: limits.tpm,
      rpd: Math.floor(limits.dailyCredits / 2_000),
      storage,
      hint: configured
        ? `${ENGINE_DISPLAY_NAME} is ready.`
        : "Kite's local composer is ready.",
    };

    return Response.json({ config, quota: await getQuotaSnapshot(user.id, user.tier) });
  } catch (error) {
    return safeApiFailure(error, "Could not load the app configuration.");
  }
}
