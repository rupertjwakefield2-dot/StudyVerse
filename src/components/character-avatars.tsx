// Inline SVG character illustrations — no external images needed.
// Each character is a distinct 56×56 cartoon-style illustration.
import React from "react";

export function CharacterSVG({ id, size = 56 }: { id: string; size?: number }) {
  const chars: Record<string, React.ReactElement> = {
    spark: <SparkChar />,
    nova: <NovaChar />,
    pixel: <PixelChar />,
    orbit: <OrbitChar />,
    cipher: <CipherChar />,
    astral: <AstralChar />,
    wizard: <WizardChar />,
    phoenix: <PhoenixChar />,
  };
  const svg = chars[id] ?? <SparkChar />;
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      {svg}
    </svg>
  );
}

// --- Spark — yellow lightning bolt with eyes ---
function SparkChar() {
  return (
    <>
      <circle cx="28" cy="28" r="24" fill="#7C3AED" fillOpacity="0.15" />
      <circle cx="28" cy="28" r="20" fill="#FDE047" />
      <path d="M31 14 22 28h8l-5 14 13-16h-8l3-12Z" fill="#7C3AED" />
      {/* eyes */}
      <circle cx="22" cy="24" r="2.5" fill="#1e1b4b" />
      <circle cx="34" cy="24" r="2.5" fill="#1e1b4b" />
      <circle cx="23" cy="23" r="0.8" fill="white" />
      <circle cx="35" cy="23" r="0.8" fill="white" />
    </>
  );
}

// --- Nova — blue star with sparkle eyes ---
function NovaChar() {
  return (
    <>
      <circle cx="28" cy="28" r="24" fill="#1D4ED8" fillOpacity="0.12" />
      <circle cx="28" cy="28" r="20" fill="#60A5FA" />
      {/* star points */}
      <path d="M28 8 l2 8-7-5 7 5-2.5 8 2.5-8 7 5-7-5Z" fill="white" fillOpacity="0.5" />
      {/* face */}
      <circle cx="22" cy="27" r="3" fill="#1e40af" />
      <circle cx="34" cy="27" r="3" fill="#1e40af" />
      <circle cx="23" cy="26" r="1" fill="white" />
      <circle cx="35" cy="26" r="1" fill="white" />
      {/* sparkle */}
      <path d="M28 33 q-2 2 0 4 q2-2 0-4Z" fill="#1e40af" />
      {/* tiny stars */}
      <circle cx="16" cy="20" r="1.5" fill="white" fillOpacity="0.8" />
      <circle cx="40" cy="18" r="1" fill="white" fillOpacity="0.8" />
      <circle cx="42" cy="36" r="1.5" fill="white" fillOpacity="0.6" />
    </>
  );
}

// --- Pixel — green blocky robot ---
function PixelChar() {
  return (
    <>
      <circle cx="28" cy="28" r="24" fill="#16A34A" fillOpacity="0.12" />
      {/* body */}
      <rect x="12" y="16" width="32" height="28" rx="4" fill="#4ADE80" />
      {/* antenna */}
      <rect x="26" y="8" width="4" height="8" rx="2" fill="#4ADE80" />
      <rect x="23" y="6" width="10" height="4" rx="2" fill="#22C55E" />
      {/* pixel eyes */}
      <rect x="17" y="22" width="8" height="8" rx="1" fill="#052e16" />
      <rect x="31" y="22" width="8" height="8" rx="1" fill="#052e16" />
      <rect x="19" y="24" width="3" height="3" fill="#86EFAC" />
      <rect x="33" y="24" width="3" height="3" fill="#86EFAC" />
      {/* mouth — pixelated smile */}
      <rect x="20" y="33" width="3" height="2" rx="0.5" fill="#052e16" />
      <rect x="23" y="35" width="10" height="2" rx="0.5" fill="#052e16" />
      <rect x="33" y="33" width="3" height="2" rx="0.5" fill="#052e16" />
    </>
  );
}

// --- Orbit — planet with ring ---
function OrbitChar() {
  return (
    <>
      <circle cx="28" cy="28" r="24" fill="#7C3AED" fillOpacity="0.12" />
      {/* ring */}
      <ellipse cx="28" cy="33" rx="22" ry="6" fill="none" stroke="#A78BFA" strokeWidth="3" />
      {/* planet */}
      <circle cx="28" cy="26" r="16" fill="#8B5CF6" />
      {/* surface markings */}
      <ellipse cx="22" cy="22" rx="5" ry="3" fill="#7C3AED" fillOpacity="0.5" />
      <ellipse cx="33" cy="30" rx="4" ry="2" fill="#7C3AED" fillOpacity="0.4" />
      {/* face */}
      <circle cx="23" cy="25" r="2.5" fill="#1e1b4b" />
      <circle cx="33" cy="25" r="2.5" fill="#1e1b4b" />
      <circle cx="24" cy="24" r="0.8" fill="white" />
      <circle cx="34" cy="24" r="0.8" fill="white" />
      <path d="M24 30 q4 3 8 0" stroke="#1e1b4b" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </>
  );
}

// --- Cipher — dark hacker with terminal eyes ---
function CipherChar() {
  return (
    <>
      <circle cx="28" cy="28" r="24" fill="#065f46" fillOpacity="0.2" />
      <circle cx="28" cy="28" r="20" fill="#064e3b" />
      {/* hood */}
      <path d="M12 28 Q12 10 28 8 Q44 10 44 28 Q44 18 28 16 Q12 18 12 28Z" fill="#065f46" />
      {/* visor */}
      <rect x="14" y="22" width="28" height="12" rx="3" fill="#10b981" fillOpacity="0.3" />
      <rect x="14" y="22" width="28" height="12" rx="3" stroke="#34d399" strokeWidth="1" fill="none" />
      {/* terminal text */}
      <text x="16" y="31" fontFamily="monospace" fontSize="7" fill="#34d399">01 10</text>
      {/* cursor blink */}
      <rect x="35" y="25" width="4" height="5" rx="0.5" fill="#34d399" />
      {/* matrix rain */}
      <text x="8" y="20" fontFamily="monospace" fontSize="5" fill="#34d399" fillOpacity="0.5">0</text>
      <text x="44" y="36" fontFamily="monospace" fontSize="5" fill="#34d399" fillOpacity="0.4">1</text>
      <text x="6" y="38" fontFamily="monospace" fontSize="5" fill="#34d399" fillOpacity="0.3">1</text>
    </>
  );
}

// --- Astral — cosmic entity with star crown ---
function AstralChar() {
  return (
    <>
      <circle cx="28" cy="28" r="24" fill="#9333EA" fillOpacity="0.1" />
      {/* cosmic aura */}
      <circle cx="28" cy="28" r="22" fill="url(#astralGrad)" />
      <defs>
        <radialGradient id="astralGrad" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#e879f9" />
          <stop offset="60%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#7e22ce" />
        </radialGradient>
      </defs>
      {/* crown / star halo */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const cx = 28 + 18 * Math.cos(rad);
        const cy = 14 + 4 * Math.sin(rad);
        return <circle key={i} cx={cx} cy={cy} r="2" fill="#fef9c3" fillOpacity="0.9" />;
      })}
      {/* face */}
      <circle cx="22" cy="28" r="3" fill="#581c87" />
      <circle cx="34" cy="28" r="3" fill="#581c87" />
      {/* star eyes */}
      <path d="M22 26 l0.7 2-1.8-1.3h2.2L21.3 28Z" fill="#fef9c3" />
      <path d="M34 26 l0.7 2-1.8-1.3h2.2L33.3 28Z" fill="#fef9c3" />
      <path d="M24 33 q4 4 8 0" stroke="#581c87" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* sparkles */}
      <path d="M12 16 l1 3-3-1 3 1-1 3 1-3 3 1-3-1Z" fill="#fef9c3" fillOpacity="0.8" />
      <path d="M42 10 l0.8 2.4-2.4-0.8 2.4 0.8-0.8 2.4 0.8-2.4 2.4 0.8-2.4-0.8Z" fill="#fef9c3" fillOpacity="0.6" />
    </>
  );
}

// --- Wizard — classic wizard hat with magic staff ---
function WizardChar() {
  return (
    <>
      <circle cx="28" cy="28" r="24" fill="#854d0e" fillOpacity="0.1" />
      {/* robe body */}
      <ellipse cx="28" cy="38" rx="16" ry="10" fill="#1e3a5f" />
      {/* face */}
      <circle cx="28" cy="30" r="10" fill="#fde68a" />
      {/* wizard hat */}
      <path d="M20 22 L28 4 L36 22Z" fill="#1e3a5f" />
      <rect x="17" y="20" width="22" height="4" rx="2" fill="#2563eb" />
      {/* hat star */}
      <path d="M28 8 l1 3-3-2 3 2-1 3 1-3 3 2-3-2Z" fill="#fde047" />
      {/* eyes */}
      <circle cx="24" cy="30" r="2.5" fill="#1e3a5f" />
      <circle cx="32" cy="30" r="2.5" fill="#1e3a5f" />
      <circle cx="25" cy="29" r="0.8" fill="white" />
      <circle cx="33" cy="29" r="0.8" fill="white" />
      {/* beard */}
      <path d="M22 35 Q28 40 34 35 Q30 42 26 42Z" fill="white" />
      {/* magic sparkles */}
      <circle cx="10" cy="20" r="2" fill="#fde047" fillOpacity="0.8" />
      <circle cx="46" cy="16" r="1.5" fill="#fde047" fillOpacity="0.7" />
      <path d="M8 28 l1 3-3-1 3 1-1 3 1-3 3 1-3-1Z" fill="#fde047" fillOpacity="0.6" />
    </>
  );
}

// --- Phoenix — fire bird ---
function PhoenixChar() {
  return (
    <>
      <circle cx="28" cy="28" r="24" fill="#b45309" fillOpacity="0.12" />
      {/* flame tail */}
      <path d="M28 44 Q14 36 16 22 Q24 30 28 28 Q32 30 40 22 Q42 36 28 44Z" fill="#f97316" />
      <path d="M28 44 Q18 38 20 26 Q26 32 28 30 Q30 32 36 26 Q38 38 28 44Z" fill="#fbbf24" />
      {/* body */}
      <ellipse cx="28" cy="24" rx="12" ry="10" fill="#ef4444" />
      {/* wings */}
      <path d="M16 24 Q6 14 10 8 Q16 16 20 22Z" fill="#f97316" />
      <path d="M40 24 Q50 14 46 8 Q40 16 36 22Z" fill="#f97316" />
      <path d="M16 24 Q8 16 12 10 Q17 18 21 22Z" fill="#fbbf24" fillOpacity="0.7" />
      <path d="M40 24 Q48 16 44 10 Q39 18 35 22Z" fill="#fbbf24" fillOpacity="0.7" />
      {/* head / beak */}
      <circle cx="28" cy="16" r="7" fill="#ef4444" />
      {/* crest */}
      <path d="M25 10 Q28 4 31 10 Q29 8 28 6 Q27 8 25 10Z" fill="#fbbf24" />
      {/* eyes */}
      <circle cx="25" cy="16" r="2.5" fill="#1e1b4b" />
      <circle cx="31" cy="16" r="2.5" fill="#1e1b4b" />
      <circle cx="26" cy="15" r="0.8" fill="white" />
      <circle cx="32" cy="15" r="0.8" fill="white" />
      {/* beak */}
      <path d="M26 20 L28 22 L30 20Z" fill="#fbbf24" />
    </>
  );
}

// Background preview swatches
export function BackgroundSwatch({ id, size = 56 }: { id: string; size?: number }) {
  const swatches: Record<string, React.ReactElement> = {
    "midnight-grid": (
      <>
        <rect width="56" height="56" fill="#0f0f1a" />
        {[0,1,2,3,4,5,6].map(i => <line key={`h${i}`} x1="0" y1={i*8+4} x2="56" y2={i*8+4} stroke="#6366f1" strokeOpacity="0.2" strokeWidth="0.5" />)}
        {[0,1,2,3,4,5,6].map(i => <line key={`v${i}`} x1={i*8+4} y1="0" x2={i*8+4} y2="56" stroke="#6366f1" strokeOpacity="0.2" strokeWidth="0.5" />)}
      </>
    ),
    "paper-desk": (
      <>
        <rect width="56" height="56" fill="#fefce8" />
        {[1,2,3,4,5,6].map(i => <line key={i} x1="0" y1={i*8} x2="56" y2={i*8} stroke="#ca8a04" strokeOpacity="0.15" strokeWidth="0.5" />)}
        <rect x="4" y="4" width="20" height="26" rx="1" fill="#fff" stroke="#d4d4d4" strokeWidth="0.5" />
        <rect x="30" y="8" width="20" height="18" rx="1" fill="#fff" stroke="#d4d4d4" strokeWidth="0.5" />
      </>
    ),
    "arcade-pop": (
      <>
        <rect width="56" height="56" fill="#0f0f1a" />
        <circle cx="10" cy="10" r="18" fill="#6366f1" fillOpacity="0.3" />
        <circle cx="46" cy="46" r="18" fill="#f43f5e" fillOpacity="0.25" />
        <text x="12" y="32" fontSize="24" fill="#a78bfa" fontFamily="monospace" fontWeight="bold">POP</text>
      </>
    ),
    "aurora-lab": (
      <>
        <rect width="56" height="56" fill="#0f0f1a" />
        <ellipse cx="14" cy="8" rx="22" ry="12" fill="#4ade80" fillOpacity="0.25" />
        <ellipse cx="42" cy="12" rx="20" ry="10" fill="#818cf8" fillOpacity="0.3" />
        <ellipse cx="28" cy="20" rx="30" ry="8" fill="#a78bfa" fillOpacity="0.15" />
      </>
    ),
    "gold-stage": (
      <>
        <rect width="56" height="56" fill="#0f0f1a" />
        <radialGradient id="gsg" cx="50%" cy="0%">
          <stop offset="0%" stopColor="#fde047" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#854d0e" stopOpacity="0" />
        </radialGradient>
        <rect width="56" height="56" fill="url(#gsg)" />
        <path d="M20 30 L28 14 L36 30Z" fill="#fde047" fillOpacity="0.5" />
        <circle cx="28" cy="12" r="4" fill="#fde047" fillOpacity="0.7" />
      </>
    ),
  };
  const swatch = swatches[id] ?? swatches["midnight-grid"];
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: 8 }}>
      {swatch}
    </svg>
  );
}

// Nametag preview badge
export function NametagBadge({ id, name, size = 56 }: { id: string; name: string; size?: number }) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    rookie:          { bg: "#1c1c2e", text: "#94a3b8", border: "#334155" },
    quizsmith:       { bg: "#1c1c2e", text: "#a78bfa", border: "#6d28d9" },
    streakstar:      { bg: "#1c1c2e", text: "#4ade80", border: "#16a34a" },
    brainboss:       { bg: "#1c1c2e", text: "#fb923c", border: "#ea580c" },
    "study-royalty": { bg: "#1c1c2e", text: "#fde047", border: "#ca8a04" },
  };
  const c = colors[id] ?? colors.rookie;
  const label = name.length > 10 ? name.slice(0, 9) + "…" : name;
  return (
    <svg width={size} height={size * 0.5} viewBox={`0 0 ${size} ${size * 0.5}`} xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width={size - 2} height={size * 0.5 - 2} rx="6" fill={c.bg} stroke={c.border} strokeWidth="1.5" />
      <text
        x={size / 2} y={size * 0.32}
        textAnchor="middle"
        fontSize={size * 0.22}
        fontFamily="system-ui, sans-serif"
        fontWeight="700"
        fill={c.text}
      >{label}</text>
    </svg>
  );
}
