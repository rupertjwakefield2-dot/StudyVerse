"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "./brand";
import { Icon } from "./icons";
import { Avatar, StatPill, backgroundClass } from "./ui";
import { useUser } from "./user-provider";
import { useTheme } from "./theme-provider";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "Home" as const },
  { href: "/tutor", label: "AI Tutor", icon: "Spark" as const },
  { href: "/humanizer", label: "Humanizer", icon: "Brain" as const },
  { href: "/revision", label: "Revision", icon: "Cards" as const },
  { href: "/games", label: "Games", icon: "Game" as const },
  { href: "/library", label: "Library", icon: "Library" as const },
  { href: "/shop", label: "Shop", icon: "Coin" as const },
  { href: "/teacher", label: "Teacher Hub", icon: "Users" as const },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { me, loading } = useUser();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const NavLinks = ({ onNav }: { onNav?: () => void }) => (
    <nav className="flex flex-col gap-1">
      {NAV.map((n) => {
        const active = pathname === n.href || pathname.startsWith(n.href + "/");
        const C = Icon[n.icon];
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNav}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? "bg-iris/12 text-iris" : "text-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <C className="h-[18px] w-[18px]" />
            {n.label}
          </Link>
        );
      })}
      <Link
        href="/premium"
        onClick={onNav}
        className={`mt-1 flex items-center gap-3 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2.5 text-sm font-semibold text-gold transition hover:bg-gold/15 ${
          pathname.startsWith("/premium") ? "ring-1 ring-gold/40" : ""
        }`}
      >
        <Icon.Crown className="h-[18px] w-[18px]" />
        Go Premium
      </Link>
    </nav>
  );

  return (
    <div className={`min-h-screen ${backgroundClass(me?.background ?? "midnight-grid")}`}>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-surface/60 p-4 backdrop-blur lg:flex">
        <div className="px-2 py-2">
          <Logo />
        </div>
        <div className="mt-6 flex-1">
          <NavLinks />
        </div>
        <UserCard me={me} loading={loading} onLogout={logout} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-border bg-surface p-4">
            <div className="flex items-center justify-between px-1">
              <Logo />
              <button onClick={() => setOpen(false)} className="btn-ghost h-9 w-9 !px-0">
                <Icon.X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6">
              <NavLinks onNav={() => setOpen(false)} />
            </div>
            <div className="mt-6">
              <UserCard me={me} loading={loading} onLogout={logout} />
            </div>
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-bg/80 px-4 py-3 backdrop-blur">
          <button onClick={() => setOpen(true)} className="btn-ghost h-9 w-9 !px-0 lg:hidden">
            <Icon.Home className="h-5 w-5" />
          </button>

          {/* Live stat bar */}
          <div className="flex flex-1 items-center gap-2 overflow-x-auto">
            {me && (
              <>
                <StatPill icon="Flame" tone="coral" value={me.streak} label="Day streak" />
                <StatPill icon="Bolt" tone="lime" value={`${me.xp} XP`} label="Total XP" />
                <StatPill icon="Coin" tone="gold" value={me.coins} label="Coins" />
                <span className="chip">Lv {me.level}</span>
                <span className="chip">{me.nametag}</span>
                {me.dailyLimit != null && (
                  <span className="chip" title="Free daily AI actions used">
                    {me.dailyUsed}/{me.dailyLimit} today
                  </span>
                )}
              </>
            )}
          </div>

          <button onClick={toggle} className="btn-ghost h-9 w-9 !px-0" title="Toggle theme">
            {theme === "dark" ? <Icon.Sun className="h-5 w-5" /> : <Icon.Moon className="h-5 w-5" />}
          </button>
          {me && <Avatar keyName={me.avatar} size={34} />}
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

function UserCard({ me, loading, onLogout }: { me: ReturnType<typeof useUser>["me"]; loading: boolean; onLogout: () => void }) {
  if (loading) return <div className="skeleton h-16 rounded-2xl" />;
  if (!me) return null;
  return (
    <div className="card-2 mt-4 p-3">
      <div className="flex items-center gap-3">
        <Avatar keyName={me.avatar} size={38} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink">{me.name}</div>
          <div className="truncate text-xs text-faint">{me.nametag} - {me.isPremium ? "Premium" : "Free plan"}</div>
        </div>
        <button onClick={onLogout} className="btn-ghost h-8 w-8 !px-0" title="Log out">
          <Icon.Logout className="h-[18px] w-[18px]" />
        </button>
      </div>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[11px] text-faint">
          <span>Level {me.progress.level}</span>
          <span>{me.progress.toNext} XP to go</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface">
          <div className="h-full rounded-full bg-lime transition-all" style={{ width: `${me.progress.pct}%` }} />
        </div>
      </div>
    </div>
  );
}
