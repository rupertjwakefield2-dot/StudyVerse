import { store } from "@/lib/store";
import { requireUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";

// Cards due for review now (spaced repetition), newest-due first.
export async function GET(req: Request) {
  return handler(async () => {
    const user = await requireUser();
    const url = new URL(req.url);
    const setId = url.searchParams.get("setId") || null;

    const cards = await store.dueFlashcards(user.id, setId, 30);
    return ok({
      cards: cards.map((c) => ({ id: c.id, front: c.front, back: c.back, topic: c.topic, subject: c.subject })),
    });
  });
}
