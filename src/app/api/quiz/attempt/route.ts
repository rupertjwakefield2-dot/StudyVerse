import { z } from "zod";
import { store } from "@/lib/store";
import { requireUser } from "@/lib/auth";
import { handler, ok, bad } from "@/lib/api";
import { awardProgress, recordTopicResult } from "@/lib/progress";
import { quizReward } from "@/lib/gamification";

// Accepts a self-contained result so single-player arcade games can report
// without a persisted quiz. `results` carries per-question outcome + topic.
const Body = z.object({
  title: z.string().default("Quiz"),
  subject: z.string().default("General"),
  topic: z.string().default("General"),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  quizId: z.string().optional(),
  results: z.array(z.object({ correct: z.boolean(), topic: z.string().optional() })).min(1),
});

export async function POST(req: Request) {
  return handler(async () => {
    const user = await requireUser();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return bad("Invalid attempt payload.");
    const input = parsed.data;

    const total = input.results.length;
    const score = input.results.filter((r) => r.correct).length;

    const fullUser = (await store.getUserById(user.id))!;
    const { xp, coins } = quizReward(score, total, input.difficulty, fullUser.isPremium);

    // Update per-topic mastery for the adaptive engine.
    for (const r of input.results) {
      await recordTopicResult(user.id, input.subject, r.topic || input.topic, r.correct);
    }

    // Persist the attempt (against a real quiz if we have one, else a shell).
    let quizId = input.quizId;
    if (!quizId) {
      quizId = await store.createQuiz({
        title: input.title,
        subject: input.subject,
        topic: input.topic,
        difficulty: input.difficulty,
        kind: "arcade",
        questions: "[]",
      });
    }
    await store.createAttempt({ userId: user.id, quizId, score, total, xpEarned: xp, coinsEarned: coins });

    const progress = await awardProgress(user.id, { xp, coins });
    return ok({ score, total, xp, coins, progress });
  });
}
