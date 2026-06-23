import { z } from "zod";
import { store } from "@/lib/store";
import { requireUser } from "@/lib/auth";
import { handler, ok, bad } from "@/lib/api";

const Body = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(""),
  subject: z.string().max(100).default("General"),
  dueDate: z.string().optional(),
  classGroup: z.string().max(100).default(""),
});

export async function GET() {
  return handler(async () => {
    const user = await requireUser();
    const tasks = await store.getHomework(user.id);
    return ok({ tasks });
  });
}

export async function POST(req: Request) {
  return handler(async () => {
    const user = await requireUser();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return bad("Invalid homework data.");
    const id = await store.createHomework({ teacherId: user.id, ...parsed.data });
    return ok({ id });
  });
}

export async function DELETE(req: Request) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await req.json().catch(() => ({}));
    if (!id) return bad("Missing homework id.");
    await store.deleteHomework(id, user.id);
    return ok({ deleted: true });
  });
}
