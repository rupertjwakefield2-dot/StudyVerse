import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { store } from "@/lib/store";
import { handler, ok, bad } from "@/lib/api";

const Body = z.object({
  studentName: z.string().min(1).max(100),
  points: z.number().int().min(1).max(10),
  reason: z.string().min(1).max(100),
  customReason: z.string().max(200).default(""),
});

export async function GET() {
  return handler(async () => {
    const user = await requireUser();
    const records = await store.getBehaviorRecords(user.id);
    const summary = await store.getStudentPointsSummary(user.id);
    return ok({ records, summary });
  });
}

export async function POST(req: Request) {
  return handler(async () => {
    const user = await requireUser();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return bad("Invalid behavior point data.");
    const d = parsed.data;
    if (d.reason === "Custom" && !d.customReason.trim()) return bad("Provide a custom reason.");
    const result = await store.addBehaviorRecord({
      teacherId: user.id,
      studentName: d.studentName.trim(),
      points: d.points,
      reason: d.reason,
      customReason: d.customReason.trim(),
    });
    return ok({ id: result.id, autoDetention: result.autoDetention });
  });
}

export async function DELETE(req: Request) {
  return handler(async () => {
    const user = await requireUser();
    const { id } = await req.json().catch(() => ({}));
    if (!id) return bad("Missing id.");
    await store.deleteBehaviorRecord(id, user.id);
    return ok({ ok: true });
  });
}
