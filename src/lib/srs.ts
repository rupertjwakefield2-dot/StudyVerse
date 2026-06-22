// Spaced repetition — a compact SM-2 variant used by flashcards and the
// adaptive revision engine to resurface difficult concepts at optimal times.

export interface SrsState {
  ease: number;      // easiness factor (>= 1.3)
  interval: number;  // days until next review
  repetition: number;
}

/**
 * grade: 0..5 self-rating (or mapped from quiz correctness).
 *   < 3  → lapse (reset interval, keep some ease)
 *   >= 3 → success (grow interval)
 */
export function sm2(state: SrsState, grade: number): SrsState & { dueAt: Date } {
  let { ease, interval, repetition } = state;

  if (grade < 3) {
    repetition = 0;
    interval = 1;
  } else {
    repetition += 1;
    if (repetition === 1) interval = 1;
    else if (repetition === 2) interval = 6;
    else interval = Math.round(interval * ease);
  }

  ease = Math.max(1.3, ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));

  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + interval);
  return { ease, interval, repetition, dueAt };
}

/** Map a correctness fraction (0..1) to an SM-2 grade. */
export function gradeFromAccuracy(accuracy: number): number {
  if (accuracy >= 0.95) return 5;
  if (accuracy >= 0.8) return 4;
  if (accuracy >= 0.6) return 3;
  if (accuracy >= 0.4) return 2;
  if (accuracy > 0) return 1;
  return 0;
}

/**
 * Update a topic's rolling mastery (0..1) after an attempt, and decide whether
 * it's a "weak topic" worth auto-scheduling revision for.
 */
export function updateMastery(
  prev: number,
  wasCorrect: boolean
): { mastery: number; isWeak: boolean; nextReviewDays: number } {
  const target = wasCorrect ? 1 : 0;
  // Exponential moving average — recent performance matters more.
  const mastery = Math.max(0, Math.min(1, prev + (target - prev) * 0.3));
  const isWeak = mastery < 0.55;
  // Weaker topics come back sooner.
  const nextReviewDays = isWeak ? 1 : mastery > 0.85 ? 7 : 3;
  return { mastery, isWeak, nextReviewDays };
}
