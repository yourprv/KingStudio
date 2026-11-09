import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
export const databaseConfigured = Boolean(databaseUrl?.trim());

export function databaseSetupResponse() {
  return Response.json(
    { error: "Database is not configured. Set DATABASE_URL to the PostgreSQL connection string, then restart the app." },
    { status: 503 },
  );
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    ...(databaseUrl ? { connectionString: databaseUrl } : {}),
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
