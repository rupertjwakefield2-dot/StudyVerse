import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handler, ok, bad } from "@/lib/api";
import { store } from "@/lib/store";
import { humanizeText } from "@/lib/ai/mock";

const Body = z.object({
  text: z.string().min(10).max(5000),
});

export async function POST(req: Request) {
  return handler(async () => {
    const user = await requireUser();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return bad("Provide text to humanize (10–5000 characters).");

    const fullUser = (await store.getUserById(user.id))!;
    const isTeacher = (fullUser as any).role === "teacher";

    // Free users: 3 uses/day; premium/teachers: unlimited
    if (!fullUser.isPremium && !isTeacher) {
      const LIMIT = 3;
      const todayKey = new Date().toISOString().slice(0, 10);
      if (fullUser.dailyUsageDay === todayKey && fullUser.dailyUsage >= LIMIT) {
        return bad("Daily humanizer limit reached (3 uses). Upgrade for unlimited access.", 402);
      }
      await store.updateUser(user.id, {
        dailyUsage: fullUser.dailyUsageDay === todayKey ? fullUser.dailyUsage + 1 : 1,
        dailyUsageDay: todayKey,
      });
    }

    // Use Anthropic if configured, otherwise use heuristic humanizer
    if (process.env.AI_PROVIDER === "anthropic" && process.env.ANTHROPIC_API_KEY) {
      try {
        const { getAI } = await import("@/lib/ai");
        const ai = getAI() as any;
        if (ai.humanize) {
          const result = await ai.humanize(parsed.data.text);
          return ok({ humanized: result });
        }
      } catch {}
    }

    const humanized = humanizeText(parsed.data.text);
    return ok({ humanized });
  });
}
