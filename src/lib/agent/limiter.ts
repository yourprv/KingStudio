import { and, asc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { generationEvents, providerLocks, studioDailyUsage, studioRequestEvents } from "@/db/schema";
import { GEMINI_MODEL } from "./gemini";

const positiveLimit = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

// These are upstream safeguards shared by all Kite users. User-facing plan caps
// are enforced separately by TIER_LIMITS below.
export const RATE_LIMIT_RPM = positiveLimit(process.env.GEMINI_RPM, 15);
export const TOKEN_LIMIT_TPM = positiveLimit(process.env.GEMINI_TPM, 250_000);
export const DAILY_LIMIT_RPD = positiveLimit(process.env.GEMINI_RPD, 500);
export const CREDITS_PER_REQUEST = 2_000;
export const MAX_OUTPUT_TOKENS = 8_192;
const WINDOW_MS = 60_000;

export type PlanTier = "free" | "go" | "plus" | "pro";
export type TierLimits = { dailyCredits: number; rpm: number; tpm: number };
export const TIER_LIMITS: Record<PlanTier, TierLimits> = {
  free: { dailyCredits: 200_000, rpm: 5, tpm: 100_000 },
  go: { dailyCredits: 300_000, rpm: 10, tpm: 175_000 },
  plus: { dailyCredits: 650_000, rpm: 15, tpm: 250_000 },
  pro: { dailyCredits: 1_000_000, rpm: 15, tpm: 250_000 },
};

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

const minuteStart = (now: Date) => new Date(now.getTime() - WINDOW_MS);
const utcDateKey = (date: Date) => date.toISOString().slice(0, 10);
const nextUtcDay = (now: Date) => Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);

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

/** Shared upstream provider request quota resets at midnight Pacific Time. */
function providerDayStart(now: Date) {
  const parts = Object.fromEntries(providerCalendar.formatToParts(now).map((part) => [part.type, Number(part.value)]));
  const target = Date.UTC(parts.year, parts.month - 1, parts.day);
  let candidate = target;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const local = Object.fromEntries(providerCalendar.formatToParts(new Date(candidate)).map((part) => [part.type, Number(part.value)]));
    const localAsUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
    const correction = target - localAsUtc;
    candidate += correction;
    if (correction === 0) break;
  }
  return new Date(candidate);
}

const nextProviderDay = (now: Date) => providerDayStart(new Date(providerDayStart(now).getTime() + 36 * 60 * 60 * 1000));

function nextWindowForTokens(events: Array<{ createdAt: Date; tokenBudget: number }>, needed: number, limit: number) {
  const total = events.reduce((sum, item) => sum + item.tokenBudget, 0);
  let released = 0;
  for (const event of events) {
    released += event.tokenBudget;
    if (total - released + needed <= limit) return Math.max(1_000, event.createdAt.getTime() + WINDOW_MS - Date.now());
  }
  return Math.max(1_000, (events[0]?.createdAt.getTime() ?? Date.now()) + WINDOW_MS - Date.now());
}

function creditSnapshot(tier: PlanTier, creditsUsed: number, requestsUsed: number): CreditSnapshot {
  const granted = TIER_LIMITS[tier].dailyCredits;
  return {
    granted,
    balance: Math.max(0, granted - creditsUsed),
    used: creditsUsed,
    requestsUsed,
    requestCost: CREDITS_PER_REQUEST,
  };
}

function quotaFromRows(
  tier: PlanTier,
  now: Date,
  requestRows: Array<{ createdAt: Date }>,
  tokenRows: Array<{ createdAt: Date; tokenBudget: number }>,
  dailyRequestsUsed: number,
): QuotaSnapshot {
  const limits = TIER_LIMITS[tier];
  const usedTokens = tokenRows.reduce((sum, event) => sum + event.tokenBudget, 0);
  const dailyLimit = Math.floor(limits.dailyCredits / CREDITS_PER_REQUEST);
  return {
    rate: {
      used: requestRows.length,
      limit: limits.rpm,
      remaining: Math.max(0, limits.rpm - requestRows.length),
      resetAt: requestRows.length ? requestRows[0].createdAt.getTime() + WINDOW_MS : now.getTime() + WINDOW_MS,
    },
    daily: {
      used: dailyRequestsUsed,
      limit: dailyLimit,
      remaining: Math.max(0, dailyLimit - dailyRequestsUsed),
      resetAt: nextUtcDay(now),
    },
    tokens: {
      used: usedTokens,
      limit: limits.tpm,
      remaining: Math.max(0, limits.tpm - usedTokens),
      resetAt: tokenRows.length ? tokenRows[0].createdAt.getTime() + WINDOW_MS : now.getTime() + WINDOW_MS,
    },
  };
}

export async function getQuotaSnapshot(userId: string, tier: PlanTier): Promise<QuotaSnapshot> {
  const now = new Date();
  const minute = minuteStart(now);
  const [requestRows, tokenRows, [usage]] = await Promise.all([
    db.select({ createdAt: studioRequestEvents.createdAt })
      .from(studioRequestEvents)
      .where(and(eq(studioRequestEvents.userId, userId), gte(studioRequestEvents.createdAt, minute)))
      .orderBy(asc(studioRequestEvents.createdAt)),
    db.select({ createdAt: generationEvents.createdAt, tokenBudget: generationEvents.tokenBudget })
      .from(generationEvents)
      .where(and(eq(generationEvents.userId, userId), eq(generationEvents.model, GEMINI_MODEL), gte(generationEvents.createdAt, minute)))
      .orderBy(asc(generationEvents.createdAt)),
    db.select({ requestsUsed: studioDailyUsage.requestsUsed })
      .from(studioDailyUsage)
      .where(and(eq(studioDailyUsage.userId, userId), eq(studioDailyUsage.usageDate, utcDateKey(now))))
      .limit(1),
  ]);
  return quotaFromRows(tier, now, requestRows, tokenRows, usage?.requestsUsed ?? 0);
}

export async function getCreditSnapshot(userId: string, tier: PlanTier): Promise<CreditSnapshot> {
  const now = new Date();
  const [usage] = await db.select({ creditsUsed: studioDailyUsage.creditsUsed, requestsUsed: studioDailyUsage.requestsUsed })
    .from(studioDailyUsage)
    .where(and(eq(studioDailyUsage.userId, userId), eq(studioDailyUsage.usageDate, utcDateKey(now))))
    .limit(1);
  return creditSnapshot(tier, usage?.creditsUsed ?? 0, usage?.requestsUsed ?? 0);
}

export type Reservation =
  | { ok: true; eventId?: string; credits: CreditSnapshot; quota: QuotaSnapshot }
  | {
      ok: false;
      code: "rate_limited" | "daily_quota" | "token_limit" | "prompt_too_large" | "credits_exhausted";
      message: string;
      retryAfterMs: number;
      credits: CreditSnapshot;
      quota: QuotaSnapshot;
    };

export class QuotaError extends Error {
  code: Extract<Reservation, { ok: false }>["code"];
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

/** Charges exactly one 2,000-credit unit per user-submitted build/edit/fix job. */
export async function reserveStudioRequest(userId: string, tier: PlanTier): Promise<Reservation> {
  const now = new Date();
  const date = utcDateKey(now);
  const minute = minuteStart(now);
  const limits = TIER_LIMITS[tier];
  const dayRequestLimit = Math.floor(limits.dailyCredits / CREDITS_PER_REQUEST);

  return db.transaction(async (tx) => {
    await tx.insert(studioDailyUsage)
      .values({ userId, usageDate: date })
      .onConflictDoNothing({ target: [studioDailyUsage.userId, studioDailyUsage.usageDate] });
    const [usage] = await tx.select().from(studioDailyUsage)
      .where(and(eq(studioDailyUsage.userId, userId), eq(studioDailyUsage.usageDate, date)))
      .for("update");
    if (!usage) throw new Error("Could not reserve the daily Kite allowance.");

    await tx.delete(studioRequestEvents).where(lt(studioRequestEvents.createdAt, new Date(now.getTime() - 24 * 60 * 60 * 1_000)));
    const [minuteRows, tokenRows] = await Promise.all([
      tx.select({ createdAt: studioRequestEvents.createdAt })
        .from(studioRequestEvents)
        .where(and(eq(studioRequestEvents.userId, userId), gte(studioRequestEvents.createdAt, minute)))
        .orderBy(asc(studioRequestEvents.createdAt)),
      tx.select({ createdAt: generationEvents.createdAt, tokenBudget: generationEvents.tokenBudget })
        .from(generationEvents)
        .where(and(eq(generationEvents.userId, userId), eq(generationEvents.model, GEMINI_MODEL), gte(generationEvents.createdAt, minute)))
        .orderBy(asc(generationEvents.createdAt)),
    ]);
    const quota = quotaFromRows(tier, now, minuteRows, tokenRows, usage.requestsUsed);
    const credits = creditSnapshot(tier, usage.creditsUsed, usage.requestsUsed);

    if (usage.creditsUsed + CREDITS_PER_REQUEST > limits.dailyCredits) {
      return {
        ok: false as const,
        code: "credits_exhausted" as const,
        message: `Your ${tier} plan has used today's Kite credits. The allowance refreshes at midnight UTC; unused credits do not carry over.`,
        retryAfterMs: Math.max(1_000, nextUtcDay(now) - now.getTime()),
        credits,
        quota,
      };
    }
    if (minuteRows.length >= limits.rpm) {
      const resetAt = minuteRows[0]?.createdAt.getTime() + WINDOW_MS || now.getTime() + WINDOW_MS;
      return {
        ok: false as const,
        code: "rate_limited" as const,
        message: `Your ${tier} plan allows ${limits.rpm} Kite requests per minute.`,
        retryAfterMs: Math.max(1_000, resetAt - now.getTime()),
        credits,
        quota,
      };
    }

    await tx.insert(studioRequestEvents).values({ userId, createdAt: now });
    await tx.update(studioDailyUsage).set({
      creditsUsed: usage.creditsUsed + CREDITS_PER_REQUEST,
      requestsUsed: usage.requestsUsed + 1,
      updatedAt: now,
    }).where(eq(studioDailyUsage.id, usage.id));

    return {
      ok: true as const,
      credits: creditSnapshot(tier, usage.creditsUsed + CREDITS_PER_REQUEST, usage.requestsUsed + 1),
      quota: {
        ...quota,
        rate: { used: minuteRows.length + 1, limit: limits.rpm, remaining: Math.max(0, limits.rpm - minuteRows.length - 1), resetAt: minuteRows[0]?.createdAt.getTime() + WINDOW_MS || now.getTime() + WINDOW_MS },
        daily: { used: usage.requestsUsed + 1, limit: dayRequestLimit, remaining: Math.max(0, dayRequestLimit - usage.requestsUsed - 1), resetAt: nextUtcDay(now) },
      },
    };
  });
}

/** Reserves one underlying model call against shared provider and per-user TPM limits. */
export async function reserveGeminiRequest(
  userId: string,
  tier: PlanTier,
  estimatedInputTokens: number,
  outputTokenBudget = MAX_OUTPUT_TOKENS,
): Promise<Reservation> {
  const now = new Date();
  const minute = minuteStart(now);
  const day = providerDayStart(now);
  const requestedBudget = estimatedInputTokens + outputTokenBudget;
  const limits = TIER_LIMITS[tier];

  return db.transaction(async (tx) => {
    await tx.insert(providerLocks).values({ model: GEMINI_MODEL }).onConflictDoNothing();
    await tx.select().from(providerLocks).where(eq(providerLocks.model, GEMINI_MODEL)).for("update");
    await tx.delete(generationEvents).where(lt(generationEvents.createdAt, day));

    const [providerEvents, [providerToday], userTokenEvents, userRequestRows, [usage]] = await Promise.all([
      tx.select({ createdAt: generationEvents.createdAt, tokenBudget: generationEvents.tokenBudget })
        .from(generationEvents)
        .where(and(eq(generationEvents.model, GEMINI_MODEL), gte(generationEvents.createdAt, minute)))
        .orderBy(asc(generationEvents.createdAt)),
      tx.select({ count: sql<number>`count(*)::int` })
        .from(generationEvents)
        .where(and(eq(generationEvents.model, GEMINI_MODEL), gte(generationEvents.createdAt, day))),
      tx.select({ createdAt: generationEvents.createdAt, tokenBudget: generationEvents.tokenBudget })
        .from(generationEvents)
        .where(and(eq(generationEvents.userId, userId), eq(generationEvents.model, GEMINI_MODEL), gte(generationEvents.createdAt, minute)))
        .orderBy(asc(generationEvents.createdAt)),
      tx.select({ createdAt: studioRequestEvents.createdAt })
        .from(studioRequestEvents)
        .where(and(eq(studioRequestEvents.userId, userId), gte(studioRequestEvents.createdAt, minute)))
        .orderBy(asc(studioRequestEvents.createdAt)),
      tx.select({ creditsUsed: studioDailyUsage.creditsUsed, requestsUsed: studioDailyUsage.requestsUsed })
        .from(studioDailyUsage)
        .where(and(eq(studioDailyUsage.userId, userId), eq(studioDailyUsage.usageDate, utcDateKey(now))))
        .limit(1),
    ]);
    const usedProviderTokens = providerEvents.reduce((sum, event) => sum + event.tokenBudget, 0);
    const usedUserTokens = userTokenEvents.reduce((sum, event) => sum + event.tokenBudget, 0);
    const providerTodayUsed = Number(providerToday?.count ?? 0);
    const nextProviderRateAt = providerEvents[0]?.createdAt.getTime() + WINDOW_MS || now.getTime() + WINDOW_MS;
    const userTokenReset = userTokenEvents[0]?.createdAt.getTime() + WINDOW_MS || now.getTime() + WINDOW_MS;
    const credits = creditSnapshot(tier, usage?.creditsUsed ?? 0, usage?.requestsUsed ?? 0);
    const userQuota = quotaFromRows(tier, now, userRequestRows, userTokenEvents, usage?.requestsUsed ?? 0);

    const fail = (code: Extract<Reservation, { ok: false }>['code'], message: string, retryAfterMs = 0): Reservation => ({
      ok: false,
      code,
      message,
      retryAfterMs,
      credits,
      quota: userQuota,
    });

    if (providerTodayUsed >= DAILY_LIMIT_RPD) {
      return fail("daily_quota", "Kite's shared model allowance is full for today.", Math.max(1_000, nextProviderDay(now).getTime() - now.getTime()));
    }
    if (providerEvents.length >= RATE_LIMIT_RPM) {
      return fail("rate_limited", "Kite's shared model request limit is busy.", Math.max(1_000, nextProviderRateAt - now.getTime()));
    }
    if (requestedBudget > TOKEN_LIMIT_TPM) {
      return fail("prompt_too_large", "This model call is larger than Kite's shared provider token limit. Reduce the workspace context before retrying.");
    }
    if (usedProviderTokens + requestedBudget > TOKEN_LIMIT_TPM) {
      return fail("token_limit", "Kite's shared model token allowance is busy. Wait for capacity and retry.", nextWindowForTokens(providerEvents, requestedBudget, TOKEN_LIMIT_TPM));
    }
    if (requestedBudget > limits.tpm) {
      return fail("prompt_too_large", `This single model call exceeds the ${tier} plan's ${limits.tpm.toLocaleString()} TPM limit. Reduce the prompt or workspace context.`);
    }
    if (usedUserTokens + requestedBudget > limits.tpm) {
      return fail("token_limit", `Your ${tier} plan's token allowance is busy. Kite will retry when capacity is available.`, nextWindowForTokens(userTokenEvents, requestedBudget, limits.tpm));
    }

    const [event] = await tx.insert(generationEvents).values({
      userId,
      model: GEMINI_MODEL,
      tokenBudget: requestedBudget,
      chargedCredits: 0,
      status: "reserved",
    }).returning({ id: generationEvents.id });
    const quota = {
      ...userQuota,
      tokens: { used: usedUserTokens + requestedBudget, limit: limits.tpm, remaining: Math.max(0, limits.tpm - usedUserTokens - requestedBudget), resetAt: userTokenReset },
    };
    return { ok: true as const, eventId: event.id, credits, quota };
  });
}

export async function settleGeminiRequest(eventId: string, success: boolean, actualTokens: number) {
  await db.update(generationEvents).set({
    status: success ? "completed" : "failed",
    chargedCredits: 0,
    tokenBudget: Math.max(0, Math.min(TOKEN_LIMIT_TPM, actualTokens)),
  }).where(and(eq(generationEvents.id, eventId), eq(generationEvents.status, "reserved")));
}
