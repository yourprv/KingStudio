import Studio from "@/components/studio/Studio";
import AuthGate from "@/components/studio/AuthGate";
import { geminiConfigured } from "@/lib/agent/gemini";
import { DAILY_LIMIT_RPD, RATE_LIMIT_RPM, TOKEN_LIMIT_TPM } from "@/lib/agent/limiter";
import { storageInfo } from "@/lib/storage";
import type { EngineConfig } from "@/lib/types";
import { databaseConfigured } from "@/db";
import { ENGINE_DISPLAY_NAME, LOCAL_ENGINE_DISPLAY_NAME } from "@/lib/engine-labels";

export const dynamic = "force-dynamic";

export default async function Page() {
  const backendAvailable =
    databaseConfigured || Boolean(process.env.BACKEND_ORIGIN);
  const storage = storageInfo();
  const config: EngineConfig = {
    provider: geminiConfigured() ? "opal" : "local-engine",
    configured: geminiConfigured(),
    model: geminiConfigured() ? ENGINE_DISPLAY_NAME : LOCAL_ENGINE_DISPLAY_NAME,
    rpm: RATE_LIMIT_RPM,
    tpm: TOKEN_LIMIT_TPM,
    rpd: DAILY_LIMIT_RPD,
    storage,
    hint: geminiConfigured()
      ? `${ENGINE_DISPLAY_NAME} is ready. Describe what you want to build.`
      : "Kite's local composer is ready. Describe what you want to build.",
  };

  return <AuthGate databaseConfigured={backendAvailable}><Studio initialProjects={[]} initialConfig={config} initialRate={null} /></AuthGate>;
}
