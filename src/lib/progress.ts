import "server-only";
import { store } from "./store";
import {
  FREE_DAILY_LIMIT,
  levelFromXp,
  nextStreak,
  todayKey,
} from "./gamification";
import { updateMastery } from "./srs";

/**
 * Enforce the free-tier daily cap. Returns remaining uses (or Infinity for
 * premium). Throws DailyLimitError when exhausted.
 */
export class DailyLimitError extends Error {
  constructor() {
    super("Daily free limit reached");
    this.name = "DailyLimitError";
  }
}

/** Check + increment daily usage. Premium users are unlimited. */
export async function consumeUsage(userId: string): Promise<{ remaining: number }> {
  const user = store.getUserById(userId);
  if (!user) throw new Error("User not found");
  if (user.isPremium) return { remaining: Infinity };

  const today = todayKey();
  const used = user.dailyUsageDay === today ? user.dailyUsage : 0;
  if (used >= FREE_DAILY_LIMIT) throw new DailyLimitError();

  store.updateUser(userId, { dailyUsage: used + 1, dailyUsageDay: today });
  return { remaining: FREE_DAILY_LIMIT - (used + 1) };
}

/** Record activity for streaks + award XP/coins, recompute level. */
export async function awardProgress(
  userId: string,
  opts: { xp?: number; coins?: number }
) {
  const user = store.getUserById(userId);
  if (!user) throw new Error("User not found");
  const today = todayKey();
  const { streak, isNewDay } = nextStreak(user.lastActiveDay, user.streak, today);
  const xp = user.xp + (opts.xp ?? 0);
  const level = levelFromXp(xp);
  const leveledUp = level > user.level;

  const updated = store.updateUser(userId, {
    xp,
    level,
    coins: user.coins + (opts.coins ?? 0),
    streak,
    longestStreak: Math.max(user.longestStreak, streak),
    lastActiveDay: today,
  });

  return {
    xp: updated.xp,
    level: updated.level,
    coins: updated.coins,
    streak: updated.streak,
    leveledUp,
    streakExtended: isNewDay,
  };
}

/** Update per-topic mastery and weak-topic flags + spaced-repetition timing. */
export async function recordTopicResult(
  userId: string,
  subject: string,
  topic: string,
  wasCorrect: boolean
) {
  const existing = store.getTopic(userId, subject, topic);
  const prev = existing?.mastery ?? 0.3;
  const { mastery, isWeak, nextReviewDays } = updateMastery(prev, wasCorrect);
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + nextReviewDays);

  store.upsertTopic(userId, subject, topic, {
    mastery,
    isWeak,
    nextReview: nextReview.toISOString(),
    correctDelta: wasCorrect ? 1 : 0,
  });
  return { mastery, isWeak };
}
