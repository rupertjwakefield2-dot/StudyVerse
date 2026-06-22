import { store } from "@/lib/store";
import { requireUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";

export async function GET() {
  return handler(async () => {
    const user = await requireUser();

    const topics = store.recentTopics(user.id, 8);
    const weakTopics = store.weakTopics(user.id, 5);
    const recentSessions = store.recentSessions(user.id, 5);
    const dueCount = store.countDueFlashcards(user.id);
    const recentAttempts = store.recentAttempts(user.id, 5);
    const setCount = store.countSets(user.id);

    return ok({
      topics: topics.map((t) => ({ subject: t.subject, topic: t.topic, mastery: t.mastery, isWeak: !!t.isWeak })),
      weakTopics: weakTopics.map((t) => ({ subject: t.subject, topic: t.topic, mastery: t.mastery })),
      recentSessions: recentSessions.map((s) => ({ id: s.id, title: s.title, subject: s.subject, mode: s.mode, createdAt: s.createdAt })),
      dueCount,
      setCount,
      recentAttempts: recentAttempts.map((a) => ({ id: a.id, title: a.quizTitle, score: a.score, total: a.total, createdAt: a.createdAt })),
    });
  });
}
