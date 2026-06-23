import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { store } from "@/lib/store";
import { FREE_DAILY_LIMIT, levelProgress, todayKey } from "@/lib/gamification";
import { UserProvider, type Me } from "@/components/user-provider";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const u = (await store.getUserById(session.id))!;
  const used = u.dailyUsageDay === todayKey() ? u.dailyUsage : 0;
  const initial: Me = {
    id: u.id,
    name: u.name,
    email: u.email,
    avatar: u.avatar,
    background: u.background,
    nametag: u.nametag,
    isPremium: u.isPremium,
    xp: u.xp,
    level: u.level,
    coins: u.coins,
    streak: u.streak,
    longestStreak: u.longestStreak,
    progress: levelProgress(u.xp),
    dailyUsed: used,
    dailyLimit: u.isPremium ? null : FREE_DAILY_LIMIT,
  };

  return (
    <UserProvider initial={initial}>
      <AppShell>{children}</AppShell>
    </UserProvider>
  );
}
