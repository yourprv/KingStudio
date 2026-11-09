import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const globalForStorage = globalThis as typeof globalThis & {
  __kiteSupabase?: SupabaseClient | null;
};

const url = process.env.SUPABASE_URL?.trim() ?? "";
const key = (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
export const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET?.trim() || "workspace";

export function supabaseConfigured() {
  return Boolean(url && key);
}

export function storageInfo() {
  return {
    provider: (supabaseConfigured() ? "supabase" : "postgres") as "supabase" | "postgres",
    bucket: SUPABASE_BUCKET,
    configured: supabaseConfigured(),
  };
}

function client(): SupabaseClient | null {
  if (!supabaseConfigured()) return null;
  if (globalForStorage.__kiteSupabase === undefined) {
    globalForStorage.__kiteSupabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return globalForStorage.__kiteSupabase;
}

const contentTypeFor = (language: string) => {
  switch (language) {
    case "html":
      return "text/html; charset=utf-8";
    case "css":
      return "text/css; charset=utf-8";
    case "javascript":
      return "text/javascript; charset=utf-8";
    case "json":
      return "application/json; charset=utf-8";
    case "markdown":
      return "text/markdown; charset=utf-8";
    default:
      return "text/plain; charset=utf-8";
  }
};

export type StorageResult = { storagePath: string | null; error?: string };

/**
 * Mirror a file into Supabase Storage. The Postgres row stays the source of
 * truth so the app keeps working when Supabase is not configured.
 */
export async function uploadFile(input: {
  projectId: string;
  path: string;
  content: string;
  language: string;
}): Promise<StorageResult> {
  const supabase = client();
  if (!supabase) return { storagePath: null };

  const objectPath = `${input.projectId}/${input.path}`;
  try {
    const { error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(objectPath, new Blob([input.content], { type: contentTypeFor(input.language) }), {
        upsert: true,
        contentType: contentTypeFor(input.language),
      });
    if (error) return { storagePath: null, error: error.message };
    return { storagePath: `${SUPABASE_BUCKET}/${objectPath}` };
  } catch (error) {
    return { storagePath: null, error: error instanceof Error ? error.message : "upload failed" };
  }
}

export async function removeFileObject(projectId: string, path: string) {
  const supabase = client();
  if (!supabase) return;
  try {
    await supabase.storage.from(SUPABASE_BUCKET).remove([`${projectId}/${path}`]);
  } catch {
    // Storage is a mirror only — never block a delete on it.
  }
}

export async function listFileObjects(projectId: string) {
  const supabase = client();
  if (!supabase) return [];
  try {
    const { data } = await supabase.storage.from(SUPABASE_BUCKET).list(projectId);
    return data ?? [];
  } catch {
    return [];
  }
}
