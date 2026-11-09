-- Paste this entire file into Supabase SQL Editor and run it once.
-- This is additive: it creates missing tables, adds owner_id if needed, and
-- denies direct Data API access to these app tables. It does not drop rows.

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text,
  name text NOT NULL,
  prompt text NOT NULL,
  summary text NOT NULL DEFAULT '',
  stack text NOT NULL DEFAULT 'html',
  status text NOT NULL DEFAULT 'ready',
  provider text NOT NULL DEFAULT 'local-engine',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS owner_id text;
CREATE INDEX IF NOT EXISTS projects_updated_at_idx ON public.projects (updated_at);
CREATE INDEX IF NOT EXISTS projects_owner_updated_idx ON public.projects (owner_id, updated_at);

CREATE TABLE IF NOT EXISTS public.workspace_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  path text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'file',
  language text NOT NULL DEFAULT 'plaintext',
  content text NOT NULL DEFAULT '',
  storage_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS workspace_files_project_path_idx
  ON public.workspace_files (project_id, path);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seq serial NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  kind text NOT NULL DEFAULT 'text',
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_project_idx
  ON public.messages (project_id, created_at);

CREATE TABLE IF NOT EXISTS public.account_credits (
  user_id text PRIMARY KEY,
  balance integer NOT NULL DEFAULT 1000000,
  credits_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.generation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  model text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  token_budget integer NOT NULL,
  charged_credits integer NOT NULL DEFAULT 2000,
  status text NOT NULL DEFAULT 'reserved'
);
CREATE INDEX IF NOT EXISTS generation_events_model_created_idx
  ON public.generation_events (model, created_at);
CREATE INDEX IF NOT EXISTS generation_events_user_created_idx
  ON public.generation_events (user_id, created_at);

CREATE TABLE IF NOT EXISTS public.provider_locks (
  model text PRIMARY KEY,
  touched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_locks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.projects, public.workspace_files, public.messages,
  public.account_credits, public.generation_events, public.provider_locks
  FROM PUBLIC, anon, authenticated;
