import { store } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";
import { FREE_DAILY_LIMIT, levelProgress, todayKey } from "@/lib/gamification";

export async function GET() {
  return handler(async () => {
    const session = await getCurrentUser();
    if (!session) return ok({ user: null });

    const u = (await store.getUserById(session.id))!;
    const used = u.dailyUsageDay === todayKey() ? u.dailyUsage : 0;

    return ok({
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        background: u.background,
        nametag: u.nametag,
        isPremium: u.isPremium,
        role: (u as any).role ?? "student",
        xp: u.xp,
        level: u.level,
        coins: u.coins,
        streak: u.streak,
        longestStreak: u.longestStreak,
        progress: levelProgress(u.xp),
        dailyUsed: used,
        dailyLimit: u.isPremium ? null : FREE_DAILY_LIMIT,
      },
    });
  });
}
