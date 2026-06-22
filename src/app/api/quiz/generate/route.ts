import { z } from "zod";
import { store } from "@/lib/store";
import { requireUser } from "@/lib/auth";
import { handler, ok, bad } from "@/lib/api";
import { getAI } from "@/lib/ai";
import { consumeUsage, DailyLimitError } from "@/lib/progress";

const Body = z.object({
  sourceText: z.string().min(1).max(8000),
  subject: z.string().optional(),
  topic: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  count: z.number().int().min(3).max(15).default(6),
  kind: z.enum(["quiz", "arcade", "mock-exam"]).default("quiz"),
  save: z.boolean().default(false),
});

export async function POST(req: Request) {
  return handler(async () => {
    const user = await requireUser();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return bad("Provide some material to build a quiz from.");
    const input = parsed.data;

    try {
      await consumeUsage(user.id);
    } catch (e) {
      if (e instanceof DailyLimitError)
        return bad("Daily free limit reached. Upgrade for unlimited quizzes.", 402);
      throw e;
    }

    const ai = getAI();
    const quiz = await ai.generateQuiz({
      sourceText: input.sourceText,
      subject: input.subject,
      topic: input.topic,
      difficulty: input.difficulty,
      count: input.count,
    });

    let quizId: string | undefined;
    if (input.save) {
      quizId = store.createQuiz({
        title: quiz.title,
        subject: quiz.subject,
        topic: quiz.topic,
        difficulty: input.difficulty,
        kind: input.kind,
        questions: JSON.stringify(quiz.questions),
      });
    }

    return ok({ quiz, quizId });
  });
}
