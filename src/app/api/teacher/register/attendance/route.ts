import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { store } from "@/lib/store";
import { handler, ok, bad } from "@/lib/api";

const Body = z.object({
  classGroup: z.string().min(1).max(60),
  date: z.string().min(8).max(10),
  session: z.enum(["AM", "PM"]).default("AM"),
  marks: z.array(z.object({
    studentName: z.string().min(1).max(100),
    mark: z.enum(["present", "late", "absent", "authorised", "illness", "excluded"]),
    note: z.string().max(200).optional(),
  })).max(200),
});

export async function GET(req: Request) {
  return handler(async () => {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const classGroup = searchParams.get("classGroup") || "My Class";
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const session = searchParams.get("session") || "AM";
    const records = await store.getAttendance(user.id, classGroup, date, session);
    return ok({ records });
  });
}

export async function POST(req: Request) {
  return handler(async () => {
    const user = await requireUser();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return bad("Invalid attendance data.");
    const { classGroup, date, session, marks } = parsed.data;
    await store.saveAttendance(user.id, classGroup, date, session, marks);
    return ok({ saved: marks.length });
  });
}
