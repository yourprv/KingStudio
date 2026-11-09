/** Convert database/driver errors into actionable text without returning SQL or bound values. */
export function databaseFailureMessage(error: unknown, fallback = "Could not save the project. Check DATABASE_URL and make sure the database schema and secure-backend migration are applied.") {
  let current: unknown = error;
  const codes = new Set<string>();

  for (let depth = 0; depth < 6 && current && typeof current === "object"; depth += 1) {
    const value = current as { code?: unknown; cause?: unknown };
    if (typeof value.code === "string") codes.add(value.code);
    current = value.cause;
  }

  if (codes.has("ENOTFOUND") || codes.has("EAI_AGAIN")) {
    return "The database host in DATABASE_URL could not be resolved. Copy the full PostgreSQL URI from Supabase Connect → Session pooler, replacing only the password placeholder.";
  }
  if (codes.has("ECONNREFUSED") || codes.has("ETIMEDOUT") || codes.has("ECONNRESET")) {
    return "Could not connect to PostgreSQL. Check the host, port, network access, and database password in DATABASE_URL.";
  }
  if (codes.has("28P01") || codes.has("28000")) {
    return "PostgreSQL rejected the credentials in DATABASE_URL. Copy a fresh connection URI and verify the database password.";
  }
  if (codes.has("42703") || codes.has("42P01")) {
    return "The PostgreSQL schema is out of date. Run drizzle/0001-secure-accounts-and-credits.sql in the Supabase SQL Editor.";
  }
  if (codes.has("42501")) {
    return "PostgreSQL denied access. Run drizzle/0001-secure-accounts-and-credits.sql in the Supabase SQL Editor and verify DATABASE_URL uses the database connection URI.";
  }
  return fallback;
}

export function fileValidationMessage(error: unknown) {
  if (!(error instanceof Error)) return null;
  if (error.message === "Use a valid relative file path." || error.message === "Keep each file under 500,000 characters.") {
    return error.message;
  }
  return null;
}

/** Keep driver messages, SQL text, and bound values out of API responses. */
export function safeApiFailure(error: unknown, fallback: string) {
  const validation = fileValidationMessage(error);
  if (validation) {
    return Response.json(
      { error: validation },
      { status: validation.includes("500,000") ? 413 : 400 },
    );
  }

  return Response.json({ error: databaseFailureMessage(error, fallback) }, { status: 503 });
}
