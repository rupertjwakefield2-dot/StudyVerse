import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { store } from "@/lib/store";
import { handler, ok, bad } from "@/lib/api";

const LATE_BP_THRESHOLD = 5;   // more than 5 min late → a behaviour point
const LATE_DT_THRESHOLD = 25;  // 25+ min late → a detention

const Body = z.object({
  studentName: z.string().min(1).max(100),
  classGroup: z.string().min(1).max(60),
  date: z.string().min(8).max(10),
  session: z.string().min(1).max(10),
  minutes: z.number().int().min(1).max(300),
});

export async function POST(req: Request) {
  return handler(async () => {
    const user = await requireUser();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return bad("Invalid late-arrival data.");
    const { studentName, classGroup, date, session, minutes } = parsed.data;

    // 1. Record the late mark on the register
    await store.saveAttendance(user.id, classGroup, date, session, [
      { studentName: studentName.trim(), mark: "late", note: `${minutes} min late` },
    ]);

    const result = { late: true, behaviourPoint: false, detention: false, detentionsCreated: 0 };

    if (minutes >= LATE_DT_THRESHOLD) {
      // 25+ min late → straight to detention
      await store.createDetention({
        teacherId: user.id,
        studentName: studentName.trim(),
        reason: `Late ${minutes} min to ${session}`,
        date,
        duration: 30,
        notes: `Auto-issued: ${minutes} min late (25+ min triggers a detention).`,
      });
      result.detention = true;
    } else if (minutes > LATE_BP_THRESHOLD) {
      // 6–24 min late → behaviour point (may itself trigger a threshold detention)
      const r = await store.addBehaviorRecord({
        teacherId: user.id,
        studentName: studentName.trim(),
        points: 1,
        reason: "Late to lesson",
        customReason: `${minutes} min late to ${session}`,
      });
      result.behaviourPoint = true;
      result.detentionsCreated = r.detentionsCreated;
    }

    return ok(result);
  });
}
