"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/icons";
import { useUser } from "@/components/user-provider";
import { COSMETICS, type CosmeticDef } from "@/lib/cosmetics";
import { CharacterSVG, BackgroundSwatch, NametagBadge } from "@/components/character-avatars";

type Tab = "packs" | "characters" | "backgrounds" | "nametags";

function CosmeticPreview({ c, size = 56 }: { c: CosmeticDef; size?: number }) {
  if (c.type === "character") return <CharacterSVG id={c.id} size={size} />;
  if (c.type === "background") return <BackgroundSwatch id={c.id} size={size} />;
  return <NametagBadge id={c.id} name={c.name} size={size} />;
}

const PACKS = [
  { key: "common", name: "Common Pack", cost: 100, emoji: "📦", desc: "Guaranteed Common or Rare item.", color: "border-border", badge: "Common / Rare" },
  { key: "rare", name: "Rare Pack", cost: 300, emoji: "💎", desc: "Guaranteed Rare or Epic item.", color: "border-iris/40", badge: "Rare / Epic" },
  { key: "legendary", name: "Legendary Pack", cost: 1000, emoji: "🌟", desc: "Guaranteed Epic or Legendary item.", color: "border-gold/40", badge: "Epic / Legendary" },
] as const;

const RARITY_COLORS: Record<string, string> = {
  common: "text-muted border-border",
  rare: "text-iris border-iris/40",
  epic: "text-coral border-coral/40",
  legendary: "text-gold border-gold/40",
};

export default function ShopPage() {
  const { me, refresh } = useUser();
  const [tab, setTab] = useState<Tab>("packs");
  const [owned, setOwned] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [pullResult, setPullResult] = useState<{ pulled: CosmeticDef; remaining: number } | null>(null);
  const [buyLoading, setBuyLoading] = useState<string | null>(null);
  const [buyError, setBuyError] = useState("");
  const [equipLoading, setEquipLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cosmetics").then((r) => r.json()).then((d) => setOwned(d.owned ?? []));
  }, []);

  async function pullGacha(pack: string) {
    setLoading(true); setPullResult(null); setBuyError("");
    try {
      const res = await fetch("/api/shop/gacha", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack }),
      });
      const data = await res.json();
      if (!res.ok) { setBuyError(data.error || "Pull failed."); return; }
      setPullResult(data);
      setOwned((o) => [...o, data.pulled.id]);
      refresh();
    } finally { setLoading(false); }
  }

  async function buyDirect(cosmeticId: string, cost: number) {
    if ((me?.coins ?? 0) < cost) { setBuyError("Not enough coins."); return; }
    setBuyLoading(cosmeticId); setBuyError("");
    try {
      const res = await fetch("/api/cosmetics/buy", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cosmeticId }),
      });
      const data = await res.json();
      if (!res.ok) { setBuyError(data.error || "Purchase failed."); return; }
      setOwned((o) => [...o, cosmeticId]);
      refresh();
    } finally { setBuyLoading(null); }
  }

  async function equip(cosmeticId: string) {
    setEquipLoading(cosmeticId);
    await fetch("/api/cosmetics/equip", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cosmeticId }),
    });
    setEquipLoading(null);
    refresh();
  }

  const byType = (type: string) => COSMETICS.filter((c) => c.type === type);


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Shop</h1>
          <p className="text-sm text-muted">Spend your StudyCoins on cosmetics, characters, and mystery packs.</p>
        </div>
        <span className="chip border-gold/40 text-gold text-base">
          <Icon.Coin className="h-4 w-4" /> {me?.coins ?? 0} coins
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-surface-2 p-1 w-fit">
        {([["packs", "Mystery Packs"], ["characters", "Characters"], ["backgrounds", "Backgrounds"], ["nametags", "Name Tags"]] as const).map(([t, label]) => (
          <button key={t} onClick={() => { setTab(t); setBuyError(""); setPullResult(null); }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === t ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </div>

      {buyError && (
        <div className="rounded-xl border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">{buyError}</div>
      )}

      {/* Gacha Pull Result */}
      {pullResult && (
        <div className="card border-gold/40 p-6 text-center animate-fade-up">
          <div className="flex justify-center mb-3">
            <CosmeticPreview c={pullResult.pulled} size={80} />
          </div>
          <h2 className="font-display text-xl font-bold text-ink">You pulled:</h2>
          <div className={`inline-flex items-center gap-2 mt-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${RARITY_COLORS[pullResult.pulled.rarity]}`}>
            {pullResult.pulled.name} <span className="text-xs capitalize opacity-70">{pullResult.pulled.rarity}</span>
          </div>
          <p className="text-sm text-muted mt-2">{pullResult.remaining} coins remaining</p>
          <button onClick={() => setPullResult(null)} className="btn-ghost mt-4">OK</button>
        </div>
      )}

      {/* Packs tab */}
      {tab === "packs" && (
        <div className="grid gap-4 sm:grid-cols-3">
          {PACKS.map((p) => (
            <div key={p.key} className={`card ${p.color} p-5 flex flex-col gap-3`}>
              <div className="text-4xl">{p.emoji}</div>
              <div>
                <h3 className="font-display font-semibold text-ink">{p.name}</h3>
                <p className="text-sm text-muted mt-0.5">{p.desc}</p>
                <span className={`chip mt-2 text-xs ${RARITY_COLORS[p.badge.split(" / ")[0].toLowerCase()]}`}>{p.badge}</span>
              </div>
              <div className="mt-auto flex items-center justify-between">
                <span className="font-bold text-ink">{p.cost} <span className="text-gold text-sm">coins</span></span>
                <button onClick={() => pullGacha(p.key)} disabled={loading || (me?.coins ?? 0) < p.cost}
                  className="btn-primary py-1.5 px-3 text-sm disabled:opacity-40">
                  {loading ? "…" : "Open pack"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Characters / Backgrounds / Nametags */}
      {tab !== "packs" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {byType(tab === "nametags" ? "nametag" : tab.slice(0, -1)).map((c) => {
            const isOwned = owned.includes(c.id);
            const canAfford = (me?.coins ?? 0) >= c.price;
            const isPremiumLocked = c.premium && !me?.isPremium;
            const isBuying = buyLoading === c.id;
            const isEquipping = equipLoading === c.id;
            const equipped = (c.type === "character" && me?.avatar === c.id)
              || (c.type === "background" && me?.background === c.id)
              || (c.type === "nametag" && me?.nametag === c.id);

            return (
              <div key={c.id} className={`card p-4 flex flex-col gap-3 ${equipped ? "border-iris/40" : ""}`}>
                {/* Preview */}
                <div className="flex items-center justify-between gap-2">
                  <div className="grid h-14 w-14 place-items-center rounded-xl bg-surface-2 overflow-hidden">
                    <CosmeticPreview c={c} size={56} />
                  </div>
                  <div className={`chip text-xs capitalize ${RARITY_COLORS[c.rarity]}`}>{c.rarity}</div>
                </div>
                <div>
                  <div className="font-semibold text-ink text-sm">{c.name}</div>
                  {isPremiumLocked && <div className="text-xs text-gold flex items-center gap-1 mt-0.5"><Icon.Crown className="h-3 w-3" /> Premium only</div>}
                </div>
                <div className="mt-auto">
                  {equipped ? (
                    <span className="chip border-iris/40 text-iris w-full justify-center text-xs">Equipped</span>
                  ) : isOwned ? (
                    <button onClick={() => equip(c.id)} disabled={isEquipping} className="btn-ghost w-full text-sm py-1.5">
                      {isEquipping ? "Equipping…" : "Equip"}
                    </button>
                  ) : isPremiumLocked ? (
                    <a href="/premium" className="btn-ghost w-full text-sm py-1.5 text-center text-gold">Unlock Premium</a>
                  ) : c.price === 0 ? (
                    <button onClick={() => buyDirect(c.id, 0)} className="btn-primary w-full text-sm py-1.5">Claim free</button>
                  ) : (
                    <button onClick={() => buyDirect(c.id, c.price)} disabled={isBuying || !canAfford}
                      className="btn-primary w-full text-sm py-1.5 disabled:opacity-40">
                      {isBuying ? "Buying…" : <><Icon.Coin className="h-3.5 w-3.5" /> {c.price}</>}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
