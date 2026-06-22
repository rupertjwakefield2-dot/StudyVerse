"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { Ring } from "@/components/ui";
import { useUser } from "@/components/user-provider";

interface DashData {
  topics: { subject: string; topic: string; mastery: number; isWeak: boolean }[];
  weakTopics: { subject: string; topic: string; mastery: number }[];
  recentSessions: { id: string; title: string; subject: string; mode: string; createdAt: string }[];
  dueCount: number;
  setCount: number;
  recentAttempts: { id: string; title: string; score: number; total: number; createdAt: string }[];
}

export default function Dashboard() {
  const { me } = useUser();
  const [data, setData] = useState<DashData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard", { cache: "no-store" }).then((r) => r.json()).then(setData);
  }, []);

  if (!me) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          Welcome back, {me.name.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-muted">Here's where you stand. Keep the streak alive.</p>
      </div>

      {/* Top stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card flex items-center gap-4 p-5">
          <Ring pct={me.progress.pct} size={72} color="var(--lime)">
            <div>
              <div className="font-display text-lg font-bold leading-none text-ink">{me.level}</div>
              <div className="text-[10px] text-faint">level</div>
            </div>
          </Ring>
          <div>
            <div className="label">Total XP</div>
            <div className="font-display text-2xl font-bold text-ink">{me.xp.toLocaleString()}</div>
            <div className="text-xs text-faint">{me.progress.toNext} to level {me.level + 1}</div>
          </div>
        </div>

        <StatCard icon="Flame" tone="coral" label="Day streak" value={me.streak} sub={`Best: ${me.longestStreak} days`} />
        <StatCard icon="Coin" tone="gold" label="Coins" value={me.coins} sub="Spend in the shop" />
        <StatCard icon="Cards" tone="iris" label="Cards due" value={data?.dueCount ?? "–"} sub={`${data?.setCount ?? 0} study sets`} link="/revision" />
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ActionCard href="/tutor" icon="Spark" title="Ask the tutor" body="Get unstuck on homework now" tone="iris" />
        <ActionCard href="/revision" icon="Cards" title="Revise weak spots" body="Spaced-repetition session" tone="lime" />
        <ActionCard href="/games" icon="Game" title="Play a quiz" body="Solo arcade or live room" tone="coral" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Weak topics / adaptive */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-ink">Topics to revise</h2>
            <Icon.Target className="h-5 w-5 text-coral" />
          </div>
          {!data ? (
            <Skeletons />
          ) : data.weakTopics.length === 0 ? (
            <Empty text="No weak topics yet — keep learning and Synapse will flag what needs work." />
          ) : (
            <ul className="mt-4 space-y-3">
              {data.weakTopics.map((t) => (
                <li key={t.subject + t.topic}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">{t.topic}</span>
                    <span className="text-xs text-faint">{t.subject}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-coral" style={{ width: `${Math.round(t.mastery * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent activity */}
        <div className="card p-5">
          <h2 className="font-display font-semibold text-ink">Recent activity</h2>
          {!data ? (
            <Skeletons />
          ) : data.recentSessions.length === 0 && data.recentAttempts.length === 0 ? (
            <Empty text="Nothing yet. Ask the tutor a question to get started." />
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {data.recentSessions.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2">
                  <Icon.Spark className="h-4 w-4 shrink-0 text-iris" />
                  <span className="flex-1 truncate text-ink">{s.title}</span>
                  <span className="chip capitalize">{s.mode}</span>
                </li>
              ))}
              {data.recentAttempts.map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2">
                  <Icon.Game className="h-4 w-4 shrink-0 text-coral" />
                  <span className="flex-1 truncate text-ink">{a.title}</span>
                  <span className="chip border-lime/40 text-lime">{a.score}/{a.total}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, tone, label, value, sub, link }: { icon: keyof typeof Icon; tone: string; label: string; value: React.ReactNode; sub: string; link?: string }) {
  const C = Icon[icon];
  const inner = (
    <div className="card flex h-full items-center gap-4 p-5 transition hover:border-iris/40">
      <div className={`grid h-12 w-12 place-items-center rounded-xl bg-surface-2 text-${tone}`}>
        <C className="h-6 w-6" />
      </div>
      <div>
        <div className="label">{label}</div>
        <div className="font-display text-2xl font-bold text-ink">{value}</div>
        <div className="text-xs text-faint">{sub}</div>
      </div>
    </div>
  );
  return link ? <Link href={link}>{inner}</Link> : inner;
}

function ActionCard({ href, icon, title, body, tone }: { href: string; icon: keyof typeof Icon; title: string; body: string; tone: string }) {
  const C = Icon[icon];
  return (
    <Link href={href} className="card group flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:border-iris/40">
      <div className={`grid h-11 w-11 place-items-center rounded-xl bg-${tone}/12 text-${tone}`}>
        <C className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="font-semibold text-ink">{title}</div>
        <div className="text-xs text-muted">{body}</div>
      </div>
      <Icon.Arrow className="h-4 w-4 text-faint transition group-hover:translate-x-0.5 group-hover:text-iris" />
    </Link>
  );
}

function Skeletons() {
  return (
    <div className="mt-4 space-y-2">
      {[0, 1, 2].map((i) => <div key={i} className="skeleton h-9 rounded-xl" />)}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="mt-4 text-sm text-muted">{text}</p>;
}
