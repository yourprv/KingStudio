# Kite Studio

Kite is a no-code workspace that turns a brief into a real project tree. The
agent can create and update nested files, preview web projects in a sandboxed
iframe, edit files directly, and export projects as ZIP files.

## Secure backend

- Supabase Auth provides email/password accounts. Every project and file API
  requires a valid access token and scopes reads and writes to the signed-in
  account.
- Gemini and Supabase secret keys are read only by server routes from runtime
  environment variables. Keep provider secrets out of source control and every
  `NEXT_PUBLIC_` variable.
- PostgreSQL stores projects, files, credits, and shared Gemini request events.
  The credit reservation and shared quota checks use database transactions so
  concurrent server instances share one limit. App tables have RLS enabled and
  no client roles can read them; the app accesses them through authenticated
  server routes.
- Each new account receives **1,000,000 credits**. A successful model request
  costs **2,000 credits**, which is 500 requests per account. A build first makes
  a plan, then generates up to four files per request, so larger projects use
  more credits. Failed provider requests return the credits; requests still
  count against the shared provider allowance because the request was sent.
- Shared defaults are **15 RPM**, **250,000 TPM**, and **500 requests per day**.
  Configure them with `GEMINI_RPM`, `GEMINI_TPM`, and `GEMINI_RPD`. Token
  reservations use a conservative prompt estimate and reconcile with Gemini's
  reported usage after a response. Provider project quotas can differ from
  these configured values.
- The model defaults to `gemini-3.5-flash-lite`. Each build or edit is planned
  first, then files are generated in batches of up to four. Up to 30 files can
  be planned in one run; incomplete batches are retried as individual
  plain-text files. An unfinished plan is saved with the project, so a
  follow-up resumes the missing files instead of planning from scratch.
  Plan-only mode uses the local planner and does not spend model credits.

## Setup

1. Copy `.env.example` to `.env.local` and fill in the values locally. Do not
   commit `.env.local`.
2. In Supabase, open **Connect → Session pooler**, copy the PostgreSQL URI,
   replace `[YOUR-PASSWORD]` with the database password, and set it as
   `DATABASE_URL` in `.env.local`. This is a database password, separate from
   the Supabase API keys. Direct connection can also be used from an IPv6
   network or a project with the IPv4 add-on.
3. In the Supabase Dashboard, open **SQL Editor**, paste the full contents of
   `drizzle/0001-secure-accounts-and-credits.sql`, and run it. It creates any
   missing Kite tables, adds account credits and quota tables, and enables RLS
   while denying client roles direct access. It is safe to rerun.
4. Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
   `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to
   your Supabase project values. Enable email/password in Supabase Auth.
5. Set `GEMINI_API_KEY` on the server and use the model and quota defaults from
   `.env.example`.
6. Optionally set `SUPABASE_SECRET_KEY` and create a private Storage bucket named
   `workspace` to mirror project files.
7. Start with `npm run dev`.

The app requires the database and Supabase Auth environment values before users
can sign in. Without a Gemini key, the built-in local composer remains available
after sign-in. Existing projects without an `owner_id` are intentionally hidden
from new accounts.

## Important credential handling

Credentials shared in chat or placed in source should be treated as exposed.
Rotate the Gemini key and the Supabase secret/JWT signing credentials in their
respective dashboards, then enter the replacements only in local or deployment
environment settings. The Supabase publishable key is intended for the browser;
the Supabase secret key and Gemini key are server-only.

## Stack

Next.js App Router, Supabase Auth and Storage, Drizzle ORM, PostgreSQL, Gemini
API, Tailwind CSS v4, and JSZip.
