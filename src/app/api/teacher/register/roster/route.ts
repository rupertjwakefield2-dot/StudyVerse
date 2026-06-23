import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { store } from "@/lib/store";
import { handler, ok, bad } from "@/lib/api";

const Body = z.object({
  name: z.string().min(1).max(100),
  classGroup: z.string().min(1).max(60).default("My Class"),
});

export async function GET(req: Request) {
  return handler(async () => {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const classGroup = searchParams.get("classGroup") ?? undefined;
    const roster = await store.getRoster(user.id, classGroup || undefined);
    const groups = await store.getClassGroups(user.id);
    return ok({ roster, groups });
  });
}

export async function POST(req: Request) {
  return handler(async () => {
    const user = await requireUser();
    const json = await req.json().catch(() => null);
    // Support bulk add: { names: "John\nJane\n...", classGroup }
    if (json && typeof json.names === "string") {
      const classGroup = (json.classGroup || "My Class").toString().slice(0, 60);
      const names = json.names.split(/[\n,]+/).map((n: string) => n.trim()).filter(Boolean).slice(0, 200);
      for (const name of names) {
        await store.addStudent({ teacherId: user.id, name: name.slice(0, 100), classGroup });
      }
      return ok({ added: names.length });
    }
    const parsed = Body.safeParse(json);
    if (!parsed.success) return bad("Provide a student name.");
    const sid = await store.addStudent({ teacherId: user.id, name: parsed.data.name.trim(), classGroup: parsed.data.classGroup });
    return ok({ id: sid });
  });
}

export async function DELETE(req: Request) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await req.json().catch(() => ({}));
    if (!id) return bad("Missing id.");
    await store.deleteStudent(id, user.id);
    return ok({ ok: true });
  });
}
