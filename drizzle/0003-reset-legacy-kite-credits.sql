-- Run after the PRV SSO and daily-quota Kite code is deployed.
-- The active allowance lives in studio_daily_usage; this clears only the
-- deprecated lifetime credit balances left from the standalone Kite version.
UPDATE public.account_credits
SET balance = 0, credits_used = 0, updated_at = now();
