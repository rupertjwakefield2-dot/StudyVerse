import { store } from "@/lib/store";
import { requireUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";

export async function GET() {
  return handler(async () => {
    const user = await requireUser();
    const sessions = store.sessionsWithCounts(user.id, 30);
    return ok({
      sessions: sessions.map((s) => ({
        id: s.id,
        title: s.title,
        subject: s.subject,
        topic: s.topic,
        mode: s.mode,
        difficulty: s.difficulty,
        interactions: s.interactions,
        createdAt: s.createdAt,
      })),
    });
  });
}
