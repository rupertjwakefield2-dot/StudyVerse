"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { rarityColor } from "@/components/ui";
import { useUser } from "@/components/user-provider";

type Tab = "sessions" | "sets" | "shop";

export default function LibraryPage() {
  const [tab, setTab] = useState<Tab>("sessions");
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Library</h1>
          <p className="mt-1 text-sm text-muted">Everything you've saved — sessions, sets, and your collection.</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-border bg-surface-2 p-1">
          {(["sessions", "sets", "shop"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${tab === t ? "bg-iris text-white" : "text-muted hover:text-ink"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {tab === "sessions" && <Sessions />}
        {tab === "sets" && <Sets />}
        {tab === "shop" && <Shop />}
      </div>
    </div>
  );
}

function Sessions() {
  const [data, setData] = useState<any[] | null>(null);
  useEffect(() => { fetch("/api/library").then((r) => r.json()).then((d) => setData(d.sessions)); }, []);
  if (!data) return <Grid />;
  if (!data.length) return <Empty text="No study sessions yet." cta={{ href: "/tutor", label: "Ask the tutor" }} />;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {data.map((s) => (
        <div key={s.id} className="card p-4">
          <div className="flex items-start gap-3">
            <Icon.Spark className="mt-0.5 h-4 w-4 shrink-0 text-iris" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-ink">{s.title}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="chip">{s.subject}</span>
                <span className="chip">{s.topic}</span>
                <span className="chip capitalize">{s.mode}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Sets() {
  const [data, setData] = useState<any[] | null>(null);
  useEffect(() => { fetch("/api/sets").then((r) => r.json()).then((d) => setData(d.sets)); }, []);
  if (!data) return <Grid />;
  if (!data.length) return <Empty text="No study sets yet." cta={{ href: "/revision", label: "Create a set" }} />;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {data.map((s) => (
        <Link key={s.id} href="/revision" className="card p-4 transition hover:border-iris/40">
          <div className="flex items-center justify-between">
            <div className="font-display font-semibold text-ink">{s.title}</div>
            {s.due > 0 && <span className="chip border-coral/40 text-coral">{s.due} due</span>}
          </div>
          <div className="mt-2 flex gap-1.5 text-xs">
            <span className="chip">{s.subject}</span>
            <span className="chip">{s.count} cards</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function Shop() {
  const { refresh } = useUser();
  const [data, setData] = useState<any | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"character" | "background" | "nametag">("character");

  const load = () => fetch("/api/cosmetics").then((r) => r.json()).then(setData);
  useEffect(() => { load(); }, []);

  async function act(url: string, id: string) {
    setBusy(id); setError("");
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const d = await res.json();
    if (!res.ok) setError(d.error || "Action failed.");
    await load();
    refresh();
    setBusy(null);
  }

  if (!data) return <Grid />;
  const items = data.items.filter((c: any) => c.type === filter);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="chip border-gold/40 text-gold"><Icon.Coin className="h-4 w-4" /> {data.coins} coins</span>
        <div className="flex gap-1 rounded-xl border border-border bg-surface-2 p-1">
          {(["character", "background", "nametag"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${filter === t ? "bg-iris text-white" : "text-muted hover:text-ink"}`}
            >
              {t}s
            </button>
          ))}
        </div>
        {error && <span className="text-sm text-coral">{error}</span>}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((c: any) => (
          <div key={c.id} className={`card flex flex-col items-center p-4 text-center ${c.equipped ? "ring-2 ring-iris" : ""}`}>
            <CosmeticPreview item={c} />
            <div className="mt-2 font-medium text-ink">{c.name}</div>
            <span className={`mt-1 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${rarityColor(c.rarity)}`}>{c.rarity}</span>
            {c.premium && <span className="mt-1 text-[10px] text-gold">Premium</span>}

            <div className="mt-3 w-full">
              {c.equipped ? (
                <span className="chip w-full justify-center border-iris/40 text-iris">Equipped</span>
              ) : c.owned ? (
                <button onClick={() => act("/api/cosmetics/equip", c.id)} disabled={busy === c.id} className="btn-ghost h-8 w-full text-xs">Equip</button>
              ) : (
                <button onClick={() => act("/api/cosmetics/buy", c.id)} disabled={busy === c.id} className="btn-primary h-8 w-full text-xs">
                  <Icon.Coin className="h-3.5 w-3.5" /> {c.price}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CosmeticPreview({ item }: { item: any }) {
  if (item.type === "background") {
    return (
      <span className="grid h-16 w-20 place-items-center rounded-xl border border-border bg-surface-2 text-[10px] font-bold text-ink">
        {item.preview}
      </span>
    );
  }
  if (item.type === "nametag") {
    return (
      <span className="grid h-16 w-24 place-items-center rounded-xl border border-border bg-surface-2 px-2 text-xs font-semibold text-iris">
        {item.preview}
      </span>
    );
  }
  return (
    <span className="grid h-16 w-16 place-items-center rounded-full border border-border bg-surface-2 font-display text-xl font-bold text-iris">
      {item.preview.slice(0, 2).toUpperCase()}
    </span>
  );
}

function Grid() {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0,1,2,3].map((i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>;
}
function Empty({ text, cta }: { text: string; cta: { href: string; label: string } }) {
  return (
    <div className="card p-8 text-center">
      <p className="text-muted">{text}</p>
      <Link href={cta.href} className="btn-primary mt-4 inline-flex">{cta.label} <Icon.Arrow className="h-4 w-4" /></Link>
    </div>
  );
}
