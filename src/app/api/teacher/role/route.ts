import { store } from "@/lib/store";
import { requireUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";

// Toggle teacher role (dev tool — in production gate this behind email verification or admin approval)
export async function POST() {
  return handler(async () => {
    const user = await requireUser();
    const fullUser = (await store.getUserById(user.id))!;
    const currentRole = (fullUser as any).role ?? "student";
    const newRole = currentRole === "teacher" ? "student" : "teacher";
    await store.updateUser(user.id, { role: newRole });
    return ok({ role: newRole });
  });
}
