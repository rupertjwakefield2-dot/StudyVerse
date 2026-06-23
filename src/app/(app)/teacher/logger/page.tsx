"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { useUser } from "@/components/user-provider";

interface FeedItem {
  id: string;
  type: "homework" | "detention" | "behavior" | "achievement" | "attendance";
  studentName: string;
  title: string;
  detail: string;
  meta: string;
  createdAt: string;
}

const TYPE_META: Record<FeedItem["type"], { label: string; icon: keyof typeof Icon; color: string; dot: string }> = {
  homework:    { label: "Homework",    icon: "Cards",  color: "text-iris",  dot: "bg-iris" },
  detention:   { label: "Detention",   icon: "Target", color: "text-coral", dot: "bg-coral" },
  behavior:    { label: "Behaviour",   icon: "Flame",  color: "text-coral", dot: "bg-coral" },
  achievement: { label: "Achievement", icon: "Bolt",   color: "text-lime",  dot: "bg-lime" },
  attendance:  { label: "Attendance",  icon: "Check",  color: "text-gold",  dot: "bg-gold" },
};

const FILTERS = [
  { key: "all", label: "All activity" },
  { key: "homework", label: "Homework" },
  { key: "behavior", label: "Behaviour" },
  { key: "achievement", label: "Achievements" },
  { key: "detention", label: "Detentions" },
  { key: "attendance", label: "Attendance" },
] as const;

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

export default function LoggerPage() {
  const { me } = useUser();
  const isTeacher = (me as any)?.role === "teacher";
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/teacher/logger")
      .then((r) => r.json())
      .then((d) => { setFeed(d.feed ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = feed.filter((f) => {
    if (filter !== "all" && f.type !== filter) return false;
    if (search && !f.studentName.toLowerCase().includes(search.toLowerCase()) && !f.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by day for the timeline
  const grouped: Array<{ day: string; items: FeedItem[] }> = [];
  for (const item of filtered) {
    const day = dayLabel(item.createdAt);
    const last = grouped[grouped.length - 1];
    if (last && last.day === day) last.items.push(item);
    else grouped.push({ day, items: [item] });
  }

  // Quick stats
  const counts = {
    behavior: feed.filter((f) => f.type === "behavior").length,
    achievement: feed.filter((f) => f.type === "achievement").length,
    homework: feed.filter((f) => f.type === "homework").length,
    detention: feed.filter((f) => f.type === "detention").length,
  };

  if (!isTeacher) {
    return (
      <div className="mx-auto max-w-xl text-center py-20">
        <div className="text-4xl mb-4">🔒</div>
        <h1 className="font-display text-xl font-bold text-ink">Teacher mode required</h1>
        <p className="mt-2 text-muted text-sm">Enable Teacher Mode in the Teacher Hub to view the activity logger.</p>
        <Link href="/teacher" className="btn-primary mt-6 inline-flex">Go to Teacher Hub</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/teacher" className="text-sm text-muted hover:text-ink">← Teacher Hub</Link>
      </div>
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Activity Logger</h1>
        <p className="mt-1 text-sm text-muted">Every homework, detention, point, and register mark — one live feed.</p>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Achievements" value={counts.achievement} icon="Bolt" color="lime" />
        <StatCard label="Behaviour" value={counts.behavior} icon="Flame" color="coral" />
        <StatCard label="Homework" value={counts.homework} icon="Cards" color="iris" />
        <StatCard label="Detentions" value={counts.detention} icon="Target" color="gold" />
      </div>

      {/* Filters + search */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface-2 p-1">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${filter === f.key ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <input className="input pl-3 pr-3 py-1.5 text-sm w-44" placeholder="Search student…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
        </div>
      ) : grouped.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-3xl mb-3">📭</div>
          <p className="text-muted text-sm">No activity yet. Log homework, points, detentions, or take the register to populate the feed.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.day}>
              <div className="sticky top-16 z-10 mb-2 inline-block rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-muted backdrop-blur">
                {group.day}
              </div>
              <div className="relative space-y-2 pl-6">
                {/* timeline rail */}
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                {group.items.map((item) => {
                  const tm = TYPE_META[item.type];
                  const C = Icon[tm.icon];
                  return (
                    <div key={`${item.type}-${item.id}`} className="relative">
                      <div className={`absolute -left-[22px] top-4 h-3.5 w-3.5 rounded-full border-2 border-bg ${tm.dot}`} />
                      <div className="card flex items-start gap-3 p-3.5">
                        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 ${tm.color}`}>
                          <C className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-semibold text-ink">{item.studentName}</span>
                              <span className={`ml-2 text-xs font-medium ${tm.color}`}>{tm.label}</span>
                            </div>
                            <span className="text-xs text-faint shrink-0 whitespace-nowrap">{timeAgo(item.createdAt)}</span>
                          </div>
                          <div className="text-sm text-ink mt-0.5">{item.title}</div>
                          {item.detail && <div className="text-xs text-muted mt-0.5">{item.detail}</div>}
                          {item.meta && <div className="text-xs text-faint mt-1">{item.meta}</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: keyof typeof Icon; color: string }) {
  const C = Icon[icon];
  const cc = color === "lime" ? "text-lime bg-lime/12" : color === "coral" ? "text-coral bg-coral/12" : color === "gold" ? "text-gold bg-gold/12" : "text-iris bg-iris/12";
  return (
    <div className="card p-3 flex items-center gap-3">
      <div className={`grid h-9 w-9 place-items-center rounded-lg ${cc}`}>
        <C className="h-4.5 w-4.5" />
      </div>
      <div>
        <div className="font-display text-xl font-bold text-ink leading-none">{value}</div>
        <div className="text-xs text-muted mt-0.5">{label}</div>
      </div>
    </div>
  );
}
