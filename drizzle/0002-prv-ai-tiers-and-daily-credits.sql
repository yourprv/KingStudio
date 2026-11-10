-- Apply after 0001-secure-accounts-and-credits.sql.
-- PRV AI is the identity and entitlement source; Kite keeps its own project data.
-- Daily usage is stored per PRV user and resets by UTC date key.

CREATE TABLE IF NOT EXISTS public.studio_daily_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  usage_date text NOT NULL,
  credits_used integer NOT NULL DEFAULT 0 CHECK (credits_used >= 0),
  requests_used integer NOT NULL DEFAULT 0 CHECK (requests_used >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT studio_daily_usage_user_date_unique UNIQUE (user_id, usage_date)
);

CREATE TABLE IF NOT EXISTS public.studio_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS studio_request_events_user_created_idx
  ON public.studio_request_events (user_id, created_at);

ALTER TABLE public.studio_daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_request_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.studio_daily_usage, public.studio_request_events
  FROM PUBLIC, anon, authenticated;

