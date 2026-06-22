import { store } from "@/lib/store";
import { requireUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";

// All study sets for the current user with card counts + due counts.
export async function GET() {
  return handler(async () => {
    const user = await requireUser();
    const sets = store.setsWithCounts(user.id);
    return ok({
      sets: sets.map((s) => ({
        id: s.id,
        title: s.title,
        subject: s.subject,
        count: s.count,
        due: s.due,
        createdAt: s.createdAt,
      })),
    });
  });
}
