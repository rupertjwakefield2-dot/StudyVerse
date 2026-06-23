import { requireUser } from "@/lib/auth";
import { store } from "@/lib/store";
import { handler, ok } from "@/lib/api";

export async function GET() {
  return handler(async () => {
    const user = await requireUser();
    const feed = await store.getActivityFeed(user.id, 120);
    return ok({ feed });
  });
}
