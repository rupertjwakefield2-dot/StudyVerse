import { z } from "zod";
import { store } from "@/lib/store";
import { requireUser } from "@/lib/auth";
import { handler, ok, bad } from "@/lib/api";
import { getAI } from "@/lib/ai";
import { awardProgress, consumeUsage, DailyLimitError, recordTopicResult } from "@/lib/progress";
import { tutorXp } from "@/lib/gamification";

const Body = z.object({
  question: z.string().min(1).max(4000),
  mode: z.enum(["guided", "hint", "quiz"]),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  subject: z.string().optional(),
  topic: z.string().optional(),
  sourceText: z.string().max(8000).optional(),
  sessionId: z.string().optional(),
});

export async function POST(req: Request) {
  return handler(async () => {
    const user = await requireUser();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return bad("Invalid request.");
    const input = parsed.data;

    try {
      await consumeUsage(user.id);
    } catch (e) {
      if (e instanceof DailyLimitError) {
        return bad("You've hit today's free limit. Upgrade to Premium for unlimited tutoring.", 402);
      }
      throw e;
    }

    const ai = getAI();
    const response = await ai.tutor({
      question: input.question,
      mode: input.mode,
      difficulty: input.difficulty,
      subject: input.subject,
      topic: input.topic,
      sourceText: input.sourceText,
    });

    // Persist the session + interaction history.
    let sessionId = input.sessionId;
    if (!sessionId) {
      sessionId = store.createSession({
        userId: user.id,
        title: input.question.slice(0, 70),
        subject: response.subject,
        topic: response.topic,
        difficulty: input.difficulty,
        mode: input.mode,
        sourceText: input.sourceText ?? "",
      });
    }

    store.createInteraction({
      userId: user.id,
      sessionId,
      mode: input.mode,
      prompt: input.question,
      response: JSON.stringify(response),
      model: ai.model,
    });

    // Touch the topic (engagement, not a correctness signal here) + award XP.
    await recordTopicResult(user.id, response.subject, response.topic, true);
    const fullUser = store.getUserById(user.id)!;
    const earned = tutorXp(input.difficulty, fullUser.isPremium);
    const progress = await awardProgress(user.id, { xp: earned, coins: 2 });

    return ok({ response, sessionId, earned, progress });
  });
}
