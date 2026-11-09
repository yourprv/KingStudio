import { and, asc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { accountCredits, generationEvents, providerLocks } from "@/db/schema";
import { GEMINI_MODEL } from "./gemini";

const positiveLimit = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

export const RATE_LIMIT_RPM = positiveLimit(process.env.GEMINI_RPM, 15);
export const TOKEN_LIMIT_TPM = positiveLimit(process.env.GEMINI_TPM, 250_000);
export const DAILY_LIMIT_RPD = positiveLimit(process.env.GEMINI_RPD, 500);
export const INITIAL_CREDITS = 1_000_000;
export const CREDITS_PER_REQUEST = 2_000;
export const MAX_OUTPUT_TOKENS = 8_192;
const WINDOW_MS = 60_000;

export type RateInfo = {
  used: number;
  limit: number;
  remaining: number;
  resetAt: number;
};

export type QuotaSnapshot = {
  rate: RateInfo;
  daily: RateInfo;
  tokens: RateInfo;
};

export type CreditSnapshot = {
  granted: number;
  balance: number;
  used: number;
  requestsUsed: number;
  requestCost: number;
};

function minuteStart(now: Date) {
  return new Date(now.getTime() - WINDOW_MS);
}

const providerTimeZone = "America/Los_Angeles";
const providerCalendar = new Intl.DateTimeFormat("en-US", {
  timeZone: providerTimeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Provider daily request quota resets at midnight Pacific Time. */
function providerDayStart(now: Date) {
  const parts = Object.fromEntries(providerCalendar.formatToParts(now).map((part) => [part.type, Number(part.value)]));
  const target = Date.UTC(parts.year, parts.month - 1, parts.day);
  let candidate = target;

  // Convert local calendar midnight to UTC, accounting for PST/PDT.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const local = Object.fromEntries(providerCalendar.formatToParts(new Date(candidate)).map((part) => [part.type, Number(part.value)]));
    const localAsUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
    const correction = target - localAsUtc;
    candidate += correction;
    if (correction === 0) break;
  }
  return new Date(candidate);
}

function nextProviderDay(now: Date) {
  const currentStart = providerDayStart(now);
  return providerDayStart(new Date(currentStart.getTime() + 36 * 60 * 60 * 1000));
}

function nextWindowForTokens(events: Array<{ createdAt: Date; tokenBudget: number }>, needed: number) {
  const total = events.reduce((sum, item) => sum + item.tokenBudget, 0);
  let released = 0;
  for (const event of events) {
    released += event.tokenBudget;
    if (total - released + needed <= TOKEN_LIMIT_TPM) {
      return Math.max(1_000, event.createdAt.getTime() + WINDOW_MS - Date.now());
    }
  }
  return Math.max(1_000, (events[0]?.createdAt.getTime() ?? Date.now()) + WINDOW_MS - Date.now());
}

export async function getQuotaSnapshot(): Promise<QuotaSnapshot> {
  const now = new Date();
  const minute = minuteStart(now);
  const day = providerDayStart(now);
  const [minuteRows, dailyRows] = await Promise.all([
    db
      .select({ createdAt: generationEvents.createdAt, tokenBudget: generationEvents.tokenBudget })
      .from(generationEvents)
      .where(and(eq(generationEvents.model, GEMINI_MODEL), gte(generationEvents.createdAt, minute)))
      .orderBy(asc(generationEvents.createdAt)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(generationEvents)
      .where(and(eq(generationEvents.model, GEMINI_MODEL), gte(generationEvents.createdAt, day))),
  ]);
  const usedTokens = minuteRows.reduce((sum, item) => sum + item.tokenBudget, 0);
  const requestUsed = minuteRows.length;
  const dailyUsed = Number(dailyRows[0]?.count ?? 0);
  const oldest = minuteRows[0]?.createdAt.getTime() ?? now.getTime();
  const resetAt = minuteRows.length ? oldest + WINDOW_MS : now.getTime() + WINDOW_MS;
  return {
    rate: {
      used: requestUsed,
      limit: RATE_LIMIT_RPM,
      remaining: Math.max(0, RATE_LIMIT_RPM - requestUsed),
      resetAt,
    },
    daily: {
      used: dailyUsed,
      limit: DAILY_LIMIT_RPD,
      remaining: Math.max(0, DAILY_LIMIT_RPD - dailyUsed),
      resetAt: nextProviderDay(now).getTime(),
    },
    tokens: {
      used: usedTokens,
      limit: TOKEN_LIMIT_TPM,
      remaining: Math.max(0, TOKEN_LIMIT_TPM - usedTokens),
      resetAt,
    },
  };
}

export async function getCreditSnapshot(userId: string): Promise<CreditSnapshot> {
  await db
    .insert(accountCredits)
    .values({ userId, balance: INITIAL_CREDITS, creditsUsed: 0 })
    .onConflictDoNothing();
  const [account] = await db.select().from(accountCredits).where(eq(accountCredits.userId, userId)).limit(1);
  return {
    granted: INITIAL_CREDITS,
    balance: account?.balance ?? INITIAL_CREDITS,
    used: account?.creditsUsed ?? 0,
    requestsUsed: Math.floor((account?.creditsUsed ?? 0) / CREDITS_PER_REQUEST),
    requestCost: CREDITS_PER_REQUEST,
  };
}

export type Reservation =
  | { ok: true; eventId: string; credits: CreditSnapshot; quota: QuotaSnapshot }
  | {
      ok: false;
      code: "rate_limited" | "daily_quota" | "token_limit" | "prompt_too_large" | "credits_exhausted";
      message: string;
      retryAfterMs: number;
      credits: CreditSnapshot;
      quota: QuotaSnapshot;
    };

export class QuotaError extends Error {
  code: "rate_limited" | "daily_quota" | "token_limit" | "prompt_too_large" | "credits_exhausted";
  retryAfterMs: number;
  credits: CreditSnapshot;
  quota: QuotaSnapshot;

  constructor(reservation: Extract<Reservation, { ok: false }>) {
    super(reservation.message);
    this.name = "QuotaError";
    this.code = reservation.code;
    this.retryAfterMs = reservation.retryAfterMs;
    this.credits = reservation.credits;
    this.quota = reservation.quota;
  }
}

/** Atomically reserves credits and shared model quota before a provider request is sent. */
export async function reserveGeminiRequest(
  userId: string,
  estimatedInputTokens: number,
  outputTokenBudget = MAX_OUTPUT_TOKENS,
): Promise<Reservation> {
  const now = new Date();
  const minute = minuteStart(now);
  const day = providerDayStart(now);
  const requestedBudget = estimatedInputTokens + outputTokenBudget;

  return db.transaction(async (tx) => {
    await tx.insert(providerLocks).values({ model: GEMINI_MODEL }).onConflictDoNothing();
    await tx.select().from(providerLocks).where(eq(providerLocks.model, GEMINI_MODEL)).for("update");
    await tx.delete(generationEvents).where(lt(generationEvents.createdAt, day));

    await tx
      .insert(accountCredits)
      .values({ userId, balance: INITIAL_CREDITS, creditsUsed: 0 })
      .onConflictDoNothing();
    const [account] = await tx
      .select()
      .from(accountCredits)
      .where(eq(accountCredits.userId, userId))
      .for("update");

    const minuteEvents = await tx
      .select({ createdAt: generationEvents.createdAt, tokenBudget: generationEvents.tokenBudget })
      .from(generationEvents)
      .where(and(eq(generationEvents.model, GEMINI_MODEL), gte(generationEvents.createdAt, minute)))
      .orderBy(asc(generationEvents.createdAt));
    const [today] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(generationEvents)
      .where(and(eq(generationEvents.model, GEMINI_MODEL), gte(generationEvents.createdAt, day)));

    const usedTokens = minuteEvents.reduce((sum, event) => sum + event.tokenBudget, 0);
    const quotaUsed = minuteEvents.length;
    const todayUsed = Number(today?.count ?? 0);
    const nextRateAt = (minuteEvents[0]?.createdAt.getTime() ?? now.getTime()) + WINDOW_MS;
    const basicQuota: QuotaSnapshot = {
      rate: {
        used: quotaUsed,
        limit: RATE_LIMIT_RPM,
        remaining: Math.max(0, RATE_LIMIT_RPM - quotaUsed),
        resetAt: nextRateAt,
      },
      daily: {
        used: todayUsed,
        limit: DAILY_LIMIT_RPD,
        remaining: Math.max(0, DAILY_LIMIT_RPD - todayUsed),
        resetAt: nextProviderDay(now).getTime(),
      },
      tokens: {
        used: usedTokens,
        limit: TOKEN_LIMIT_TPM,
        remaining: Math.max(0, TOKEN_LIMIT_TPM - usedTokens),
        resetAt: nextRateAt,
      },
    };

    const accountSnapshot = (balance: number, used: number): CreditSnapshot => ({
      granted: INITIAL_CREDITS,
      balance,
      used,
      requestsUsed: Math.floor(used / CREDITS_PER_REQUEST),
      requestCost: CREDITS_PER_REQUEST,
    });

    if (todayUsed >= DAILY_LIMIT_RPD) {
      return {
        ok: false as const,
        code: "daily_quota" as const,
        message: "The shared daily request allowance is used. It resets at midnight Pacific Time.",
        retryAfterMs: Math.max(1_000, nextProviderDay(now).getTime() - now.getTime()),
        credits: accountSnapshot(account?.balance ?? INITIAL_CREDITS, account?.creditsUsed ?? 0),
        quota: basicQuota,
      };
    }
    if (quotaUsed >= RATE_LIMIT_RPM) {
      return {
        ok: false as const,
        code: "rate_limited" as const,
        message: `The shared limit is ${RATE_LIMIT_RPM} requests per minute. Kite is holding this request.`,
        retryAfterMs: Math.max(1_000, nextRateAt - now.getTime()),
        credits: accountSnapshot(account?.balance ?? INITIAL_CREDITS, account?.creditsUsed ?? 0),
        quota: basicQuota,
      };
    }
    if (estimatedInputTokens > TOKEN_LIMIT_TPM || requestedBudget > TOKEN_LIMIT_TPM) {
      return {
        ok: false as const,
        code: "prompt_too_large" as const,
        message: "This request is too large for the current per-minute token allowance. Shorten the brief or workspace context.",
        retryAfterMs: 0,
        credits: accountSnapshot(account?.balance ?? INITIAL_CREDITS, account?.creditsUsed ?? 0),
        quota: basicQuota,
      };
    }
    if (usedTokens + requestedBudget > TOKEN_LIMIT_TPM) {
      return {
        ok: false as const,
        code: "token_limit" as const,
        message: "The shared token allowance is busy. Kite is waiting for capacity.",
        retryAfterMs: nextWindowForTokens(minuteEvents, requestedBudget),
        credits: accountSnapshot(account?.balance ?? INITIAL_CREDITS, account?.creditsUsed ?? 0),
        quota: basicQuota,
      };
    }
    if (!account || account.balance < CREDITS_PER_REQUEST) {
      return {
        ok: false as const,
        code: "credits_exhausted" as const,
        message: "This account has used its available credits.",
        retryAfterMs: 0,
        credits: accountSnapshot(account?.balance ?? 0, account?.creditsUsed ?? 0),
        quota: basicQuota,
      };
    }

    await tx
      .update(accountCredits)
      .set({
        balance: account.balance - CREDITS_PER_REQUEST,
        creditsUsed: account.creditsUsed + CREDITS_PER_REQUEST,
        updatedAt: now,
      })
      .where(eq(accountCredits.userId, userId));
    const [event] = await tx
      .insert(generationEvents)
      .values({
        userId,
        model: GEMINI_MODEL,
        tokenBudget: requestedBudget,
        chargedCredits: CREDITS_PER_REQUEST,
        status: "reserved",
      })
      .returning({ id: generationEvents.id });

    const quota: QuotaSnapshot = {
      rate: { ...basicQuota.rate, used: quotaUsed + 1, remaining: Math.max(0, RATE_LIMIT_RPM - quotaUsed - 1) },
      daily: { ...basicQuota.daily, used: todayUsed + 1, remaining: Math.max(0, DAILY_LIMIT_RPD - todayUsed - 1) },
      tokens: { ...basicQuota.tokens, used: usedTokens + requestedBudget, remaining: Math.max(0, TOKEN_LIMIT_TPM - usedTokens - requestedBudget) },
    };
    return {
      ok: true as const,
      eventId: event.id,
      credits: accountSnapshot(account.balance - CREDITS_PER_REQUEST, account.creditsUsed + CREDITS_PER_REQUEST),
      quota,
    };
  });
}

export async function settleGeminiRequest(eventId: string, success: boolean, actualTokens: number) {
  await db.transaction(async (tx) => {
    const [event] = await tx
      .select()
      .from(generationEvents)
      .where(eq(generationEvents.id, eventId))
      .for("update");
    if (!event || event.status !== "reserved") return;

    await tx
      .update(generationEvents)
      .set({
        status: success ? "completed" : "failed",
        chargedCredits: success ? CREDITS_PER_REQUEST : 0,
        tokenBudget: Math.max(0, Math.min(TOKEN_LIMIT_TPM, actualTokens || Math.max(1, event.tokenBudget - MAX_OUTPUT_TOKENS))),
      })
      .where(eq(generationEvents.id, eventId));

    if (!success) {
      const [account] = await tx
        .select()
        .from(accountCredits)
        .where(eq(accountCredits.userId, event.userId))
        .for("update");
      if (account) {
        await tx
          .update(accountCredits)
          .set({
            balance: Math.min(INITIAL_CREDITS, account.balance + CREDITS_PER_REQUEST),
            creditsUsed: Math.max(0, account.creditsUsed - CREDITS_PER_REQUEST),
            updatedAt: new Date(),
          })
          .where(eq(accountCredits.userId, event.userId));
      }
    }
  });
}
