// Minimal inline icon set (stroke-based, inherits currentColor). No icon lib
// dependency — keeps the bundle lean and the look consistent.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const Icon = {
  Brain: (p: P) => (
    <svg {...base(p)}>
      <path d="M9 3a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 1 5 3 3 0 0 0 5 1.5V6a3 3 0 0 0-1-3Z" />
      <path d="M15 3a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-1 5 3 3 0 0 1-5 1.5V6a3 3 0 0 1 1-3Z" />
    </svg>
  ),
  Home: (p: P) => (
    <svg {...base(p)}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>
  ),
  Spark: (p: P) => (
    <svg {...base(p)}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>
  ),
  Cards: (p: P) => (
    <svg {...base(p)}><rect x="3" y="6" width="13" height="14" rx="2" /><path d="M8 3h11a2 2 0 0 1 2 2v11" /></svg>
  ),
  Game: (p: P) => (
    <svg {...base(p)}><rect x="2" y="7" width="20" height="11" rx="4" /><path d="M7 12h3M8.5 10.5v3M15 11h.01M18 13h.01" /></svg>
  ),
  Crown: (p: P) => (
    <svg {...base(p)}><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8Z" /></svg>
  ),
  Flame: (p: P) => (
    <svg {...base(p)}><path d="M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c0-1 0-1 .5-2 1.5 1.5 2.5 3 2.5 5a5 5 0 0 1-10 0c0-4 4-6 5-10Z" /></svg>
  ),
  Bolt: (p: P) => (
    <svg {...base(p)}><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" /></svg>
  ),
  Coin: (p: P) => (
    <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M9 12h6M12 8.5c2 0 2 3 0 3s-2 3 0 3" /></svg>
  ),
  Mic: (p: P) => (
    <svg {...base(p)}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
  ),
  Library: (p: P) => (
    <svg {...base(p)}><path d="M4 5v14M9 4v16M14 6l5 13M19 19l-1-1" /><path d="M9 4h5l5 13" /></svg>
  ),
  Image: (p: P) => (
    <svg {...base(p)}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="m4 17 5-5 4 4 3-3 4 4" /></svg>
  ),
  Send: (p: P) => (
    <svg {...base(p)}><path d="M4 12 20 4l-6 16-3-7-7-1Z" /></svg>
  ),
  Play: (p: P) => (
    <svg {...base(p)}><path d="M7 5l12 7-12 7V5Z" /></svg>
  ),
  Pause: (p: P) => (
    <svg {...base(p)}><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
  ),
  Repeat: (p: P) => (
    <svg {...base(p)}><path d="M4 9a6 6 0 0 1 10-3l3 2M20 15a6 6 0 0 1-10 3l-3-2" /><path d="M17 4v4h-4M7 20v-4h4" /></svg>
  ),
  Turtle: (p: P) => (
    <svg {...base(p)}><path d="M5 14a7 7 0 0 1 14 0M5 14h14M5 14l-2 3M19 14l2 3M9 14V9M15 14V9M12 7v7" /></svg>
  ),
  Check: (p: P) => (
    <svg {...base(p)}><path d="M4 12.5 9 17l11-11" /></svg>
  ),
  X: (p: P) => (
    <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>
  ),
  Sun: (p: P) => (
    <svg {...base(p)}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></svg>
  ),
  Moon: (p: P) => (
    <svg {...base(p)}><path d="M20 14A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14Z" /></svg>
  ),
  Logout: (p: P) => (
    <svg {...base(p)}><path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 12H3M6 8l-4 4 4 4" /></svg>
  ),
  Target: (p: P) => (
    <svg {...base(p)}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.6" /></svg>
  ),
  Arrow: (p: P) => (
    <svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  ),
};
