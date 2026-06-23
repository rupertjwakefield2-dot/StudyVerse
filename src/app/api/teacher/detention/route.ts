import { z } from "zod";
import { store } from "@/lib/store";
import { requireUser } from "@/lib/auth";
import { handler, ok, bad } from "@/lib/api";

const Body = z.object({
  studentName: z.string().min(1).max(200),
  reason: z.string().min(1).max(500),
  date: z.string(),
  duration: z.number().int().min(5).max(480).default(30),
  notes: z.string().max(1000).default(""),
});

export async function GET() {
  return handler(async () => {
    const user = await requireUser();
    const detentions = await store.getDetentions(user.id);
    return ok({ detentions });
  });
}

export async function POST(req: Request) {
  return handler(async () => {
    const user = await requireUser();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return bad("Invalid detention data.");
    const id = await store.createDetention({ teacherId: user.id, ...parsed.data });
    return ok({ id });
  });
}

export async function DELETE(req: Request) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await req.json().catch(() => ({}));
    if (!id) return bad("Missing detention id.");
    await store.deleteDetention(id, user.id);
    return ok({ deleted: true });
  });
}
