# Kite Studio

Kite is a no-code workspace that turns a brief into a real project tree. The
agent can create and update nested files, preview web projects in a sandboxed
iframe, edit files directly, and export projects as ZIP files.

## Secure backend

- PRV AI is the identity and plan source. Its `/api/kite/sso/issue` endpoint
  returns a single-use, 60-second authorization code; Kite redeems it server to
  server, then issues a Kite-only HttpOnly session. PRV access and refresh
  tokens are never sent to Kite. Kite checks the current PRV entitlement on
  each authenticated API request, while project data stays in Kite's database.
- Gemini and Supabase secret keys are read only by server routes from runtime
  environment variables. Keep provider secrets out of source control and every
  `NEXT_PUBLIC_` variable.
- PostgreSQL stores projects, files, credits, and shared Gemini request events.
  The credit reservation and shared quota checks use database transactions so
  concurrent server instances share one limit. App tables have RLS enabled and
  no client roles can read them; the app accesses them through authenticated
  server routes.
- Each user-submitted build, edit, or fix costs **2,000 credits**, regardless of
  output length. Daily grants refresh at midnight UTC and do not carry over:
  Free **200,000** (100 requests), Go **300,000** (150), Plus **650,000** (325),
  and Pro **1,000,000** (500). A multi-file build is still one credit request.
- Per-account limits follow the current PRV AI tier: Free **5 RPM / 100,000 TPM**,
  Go **10 RPM / 175,000 TPM**, Plus **15 RPM / 250,000 TPM**, and Pro **15 RPM /
  250,000 TPM**. RPM counts submitted Kite jobs; TPM counts the model calls used
  inside those jobs. Shared upstream safeguards remain **15 RPM**, **250,000 TPM**,
  and **500 model calls per day** by default.
  Configure them with `GEMINI_RPM`, `GEMINI_TPM`, and `GEMINI_RPD`. Token
  reservations use a conservative prompt estimate and reconcile with Gemini's
  reported usage after a response. Provider project quotas can differ from
  these configured values.
- The model defaults to `gemini-3.5-flash-lite`. Each build or edit is planned
  first, then files are generated in batches of up to four. Up to 30 files can
  be planned in one run; incomplete batches are retried as individual
  plain-text files. An unfinished plan is saved with the project, so a
  follow-up resumes the missing files instead of planning from scratch.
  Plan-only mode uses the local planner and does not consume Gemini model tokens;
  the submitted turn still counts as one Kite request.
- Gemini 3.5 Flash-Lite supports a 1,048,576-token input window ([model details](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite)). Kite includes the complete saved non-secret workspace in planning and file-writing prompts, then checks generated JavaScript, TypeScript, and JSON syntax before saving. Invalid files are regenerated with the parser diagnostic. `GEMINI_TPM` is a separate per-minute allowance and must match the actual provider quota.

## Setup

1. Copy `.env.example` to `.env.local` and fill in the values locally. Do not
   commit `.env.local`. Set `PRV_API_URL` to PRV AI's backend service URL (not
   the `prvai.vercel.app` static frontend URL). Set `KITE_SSO_SHARED_SECRET` to
   the same random secret configured on the PRV AI backend, and create a
   separate `KITE_SESSION_SECRET` of at least 32 characters.
2. In Supabase, open **Connect → Session pooler**, copy the PostgreSQL URI,
   replace `[YOUR-PASSWORD]` with the database password, and set it as
   `DATABASE_URL` in `.env.local`. This is a database password, separate from
   the Supabase API keys. Direct connection can also be used from an IPv6
   network or a project with the IPv4 add-on.
3. In the Kite Supabase Dashboard, run `drizzle/0001-secure-accounts-and-credits.sql`,
   then `drizzle/0002-prv-ai-tiers-and-daily-credits.sql` to create the new daily
   usage tables. Deploy Kite, then run `drizzle/0003-reset-legacy-kite-credits.sql`
   to clear the unused lifetime credit ledger without interrupting the new daily ledger.
4. Keep `SUPABASE_URL` and `SUPABASE_SECRET_KEY` for Kite's optional Storage
   mirror. Kite authentication no longer uses Kite Supabase Auth.
5. Set `GEMINI_API_KEY` on the server and use the model and quota defaults from
   `.env.example`.
6. Optionally set `SUPABASE_SECRET_KEY` and create a private Storage bucket named
   `workspace` to mirror project files.
7. Start with `npm run dev`.

The app requires the Kite database, PRV API URL, and both Kite SSO secrets before
users can sign in. In PRV AI, run `backend/supabase/kite_sso.sql`, set the same
`KITE_SSO_SHARED_SECRET` on the PRV backend, and set
`VITE_KITE_STUDIO_URL=https://kitestudio-prvai.vercel.app` in the PRV frontend deployment. Every submitted generation
turn, including plan-only and local-composer replies, uses one 2,000-credit
request. Without a Gemini key, the built-in local composer remains available
after sign-in.

## Browser npm preview

Projects with a root `package.json` can run inside the browser from the project-level
**Preview** button. The **Code** and **Preview** controls stay available independently
of the selected file. Selecting Preview recommends downloading the ZIP and following
the README in an IDE; **Continue anyway** starts the browser runtime. Kite mounts the
saved files, runs `npm install`, starts the `dev` or `start` script, and streams
package, build, and preview errors into the terminal panel.
Kite automatically tries up to two agent repairs per run, then restarts the project;
**Ask Kite to fix** remains available for a manual retry. Local HTML builds include
a dependency-free Node dev server so they also start in WebContainers. Projects
without a package manifest keep using the static HTML preview.

When you paste an IDE or terminal error into the project chat, the agent receives the
original brief and current workspace file context, including the package manifest,
README, and relevant entry or configuration files.

The virtual filesystem, installed `node_modules`, terminal output, and preview
process stay inside the browser and are not written to Supabase. Kite's saved
project files and generated repairs still use the existing authenticated project
API and persistence flow; this feature does not add database tables or store the
virtual machine state there.

The app sends `Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: credentialless` headers for WebContainer's browser
runtime. Restart the Next.js server after changing these headers. The runtime
requires a supported, cross-origin-isolated browser; desktop Chromium is the
recommended target. See the [WebContainers browser support guide](https://webcontainers.io/guides/browser-support).

The runtime moves Node.js execution into the user's browser, so it does not add
server compute costs. StackBlitz states that production use of the WebContainer
API in a commercial, for-profit app requires a license; confirm the applicable
terms before deploying this feature commercially. See [WebContainers commercial usage](https://webcontainers.io/enterprise).

## Important credential handling

Credentials shared in chat or placed in source should be treated as exposed.
Rotate the Gemini key and the Supabase secret/JWT signing credentials in their
respective dashboards, then enter the replacements only in local or deployment
environment settings. The Supabase publishable key is intended for the browser;
the Supabase secret key and Gemini key are server-only.

## Stack

Next.js App Router, PRV AI SSO, optional Supabase Storage, Drizzle ORM,
PostgreSQL, Gemini API, Tailwind CSS v4, and JSZip.
