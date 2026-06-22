import { z } from "zod";
import { store } from "@/lib/store";
import { requireUser } from "@/lib/auth";
import { handler, ok, bad } from "@/lib/api";
import { getAI } from "@/lib/ai";
import { consumeUsage, DailyLimitError } from "@/lib/progress";

const Body = z.object({
  sourceText: z.string().min(1).max(8000),
  subject: z.string().optional(),
  title: z.string().optional(),
  count: z.number().int().min(3).max(20).default(8),
  save: z.boolean().default(true),
});

export async function POST(req: Request) {
  return handler(async () => {
    const user = await requireUser();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return bad("Provide some material to build flashcards from.");
    const input = parsed.data;

    try {
      await consumeUsage(user.id);
    } catch (e) {
      if (e instanceof DailyLimitError)
        return bad("Daily free limit reached. Upgrade for unlimited flashcards.", 402);
      throw e;
    }

    const ai = getAI();
    const result = await ai.generateFlashcards({
      sourceText: input.sourceText,
      subject: input.subject,
      count: input.count,
    });

    let setId: string | undefined;
    if (input.save) {
      setId = store.createSet({
        userId: user.id,
        title: input.title || result.title,
        subject: result.subject,
      });
      store.createFlashcards(
        user.id,
        setId,
        result.cards.map((c) => ({ front: c.front, back: c.back, subject: result.subject, topic: c.topic }))
      );
    }

    return ok({ result, setId });
  });
}
