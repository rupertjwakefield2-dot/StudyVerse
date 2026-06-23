"use client";

import { Icon } from "./icons";
import { COSMETIC_MAP } from "@/lib/cosmetics";
import { CharacterSVG } from "./character-avatars";

export function Avatar({ keyName, size = 40 }: { keyName: string; size?: number }) {
  const a = COSMETIC_MAP.get(keyName) ?? COSMETIC_MAP.get("spark")!;
  return (
    <span
      className="grid place-items-center rounded-full border border-border bg-surface-2 overflow-hidden"
      style={{ width: size, height: size }}
      title={a.name}
    >
      <CharacterSVG id={a.type === "character" ? a.id : "spark"} size={size} />
    </span>
  );
}

export function backgroundClass(keyName: string) {
  switch (keyName) {
    case "paper-desk": return "bg-[radial-gradient(circle_at_top_left,rgb(var(--gold)/0.12),transparent_35%),rgb(var(--bg))]";
    case "arcade-pop": return "bg-[linear-gradient(135deg,rgb(var(--iris)/0.18),transparent_36%),linear-gradient(315deg,rgb(var(--coral)/0.16),transparent_40%),rgb(var(--bg))]";
    case "aurora-lab": return "bg-[radial-gradient(circle_at_20%_0%,rgb(var(--lime)/0.14),transparent_35%),radial-gradient(circle_at_80%_15%,rgb(var(--iris)/0.18),transparent_36%),rgb(var(--bg))]";
    case "gold-stage": return "bg-[radial-gradient(circle_at_50%_0%,rgb(var(--gold)/0.2),transparent_42%),rgb(var(--bg))]";
    default: return "bg-bg";
  }
}

export function StatPill({
  icon,
  value,
  tone = "ink",
  label,
}: {
  icon: keyof typeof Icon;
  value: React.ReactNode;
  tone?: "ink" | "lime" | "coral" | "gold" | "iris";
  label?: string;
}) {
  const C = Icon[icon];
  const toneClass =
    tone === "lime" ? "text-lime" : tone === "coral" ? "text-coral" : tone === "gold" ? "text-gold" : tone === "iris" ? "text-iris" : "text-ink";
  return (
    <span className="chip gap-1.5" title={label}>
      <C className={`h-4 w-4 ${toneClass}`} />
      <span className="font-semibold text-ink">{value}</span>
    </span>
  );
}

export function Ring({
  pct,
  size = 64,
  stroke = 6,
  children,
  color = "var(--iris)",
}: {
  pct: number;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--border))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`rgb(${color})`}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function rarityColor(rarity: string) {
  switch (rarity) {
    case "legendary": return "text-gold border-gold/40 bg-gold/10";
    case "epic": return "text-coral border-coral/40 bg-coral/10";
    case "rare": return "text-iris border-iris/40 bg-iris/10";
    default: return "text-muted border-border bg-surface-2";
  }
}
