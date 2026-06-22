import { z } from "zod";
import { store } from "@/lib/store";
import { requireUser } from "@/lib/auth";
import { handler, ok, bad } from "@/lib/api";
import { sm2 } from "@/lib/srs";
import { awardProgress, recordTopicResult } from "@/lib/progress";

// grade: 0 (forgot) .. 5 (perfect). UI maps Again/Hard/Good/Easy → 2/3/4/5.
const Body = z.object({
  cardId: z.string(),
  grade: z.number().int().min(0).max(5),
});

export async function POST(req: Request) {
  return handler(async () => {
    const user = await requireUser();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return bad("Invalid review.");
    const { cardId, grade } = parsed.data;

    const card = store.getFlashcard(user.id, cardId);
    if (!card) return bad("Card not found.", 404);

    const next = sm2({ ease: card.ease, interval: card.interval, repetition: card.repetition }, grade);
    store.updateFlashcardSrs(card.id, {
      ease: next.ease,
      interval: next.interval,
      repetition: next.repetition,
      dueAt: next.dueAt.toISOString(),
    });

    await recordTopicResult(user.id, card.subject, card.topic, grade >= 3);
    const progress = await awardProgress(user.id, { xp: 4 });

    return ok({ nextDue: next.dueAt, interval: next.interval, progress });
  });
}
