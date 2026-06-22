// XP / level / streak / reward rules. Pure functions — easy to test and reuse
// on both client (previews) and server (source of truth).

export const FREE_DAILY_LIMIT = 15; // AI actions per day for free users

/** Total XP required to have *reached* a given level (1-indexed). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  // Gentle quadratic curve: 0,120,300,540,840,...
  return Math.round(60 * (level - 1) * level);
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
}

export interface LevelProgress {
  level: number;
  intoLevel: number;   // xp earned within current level
  span: number;        // xp needed to clear current level
  pct: number;         // 0..100
  toNext: number;      // xp remaining to next level
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const span = next - base;
  const intoLevel = xp - base;
  return {
    level,
    intoLevel,
    span,
    pct: span > 0 ? Math.min(100, Math.round((intoLevel / span) * 100)) : 100,
    toNext: Math.max(0, next - xp),
  };
}

/** XP reward for a tutoring action, scaled by difficulty and premium bonus. */
export function tutorXp(difficulty: string, isPremium: boolean): number {
  const base = difficulty === "hard" ? 25 : difficulty === "easy" ? 10 : 15;
  return isPremium ? Math.round(base * 1.5) : base;
}

/** Reward for a quiz attempt. Premium users earn enhanced rewards. */
export function quizReward(
  correct: number,
  total: number,
  difficulty: string,
  isPremium: boolean
): { xp: number; coins: number } {
  const perCorrect = difficulty === "hard" ? 12 : difficulty === "easy" ? 6 : 9;
  const accuracy = total > 0 ? correct / total : 0;
  const perfectBonus = accuracy === 1 ? 20 : 0;
  let xp = correct * perCorrect + perfectBonus;
  let coins = Math.round(correct * 2 + accuracy * 10);
  if (isPremium) {
    xp = Math.round(xp * 1.5);
    coins = Math.round(coins * 1.5);
  }
  return { xp, coins };
}

export function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function dayDiff(a: string, b: string): number {
  const da = new Date(a + "T00:00:00Z").getTime();
  const db = new Date(b + "T00:00:00Z").getTime();
  return Math.round((db - da) / 86400000);
}

/**
 * Given the user's last active day + current streak, compute the updated
 * streak for activity happening "today".
 */
export function nextStreak(
  lastActiveDay: string | null,
  currentStreak: number,
  today = todayKey()
): { streak: number; isNewDay: boolean } {
  if (!lastActiveDay) return { streak: 1, isNewDay: true };
  const diff = dayDiff(lastActiveDay, today);
  if (diff === 0) return { streak: Math.max(1, currentStreak), isNewDay: false };
  if (diff === 1) return { streak: currentStreak + 1, isNewDay: true };
  return { streak: 1, isNewDay: true }; // streak broken
}

/** Adaptive difficulty: nudge based on rolling mastery (0..1). */
export function adaptiveDifficulty(mastery: number): "easy" | "medium" | "hard" {
  if (mastery >= 0.75) return "hard";
  if (mastery <= 0.4) return "easy";
  return "medium";
}
