import Link from "next/link";
import { Icon } from "@/components/icons";
import { getCurrentUser } from "@/lib/auth";

const FREE_MODES = [
  {
    name: "Classic Trivia",
    tag: "Free",
    body: "Speed + accuracy leaderboard sprint. Fastest correct answers climb the board.",
    tone: "iris",
    href: "/games/host",
    emoji: "🏆",
  },
  {
    name: "Tower Defense",
    tag: "Free",
    body: "Defend your base with correct answers. Wrong answers let enemies break through.",
    tone: "lime",
    href: "/games/tower",
    emoji: "🏰",
  },
  {
    name: "Solo Arcade",
    tag: "Free",
    body: "Timed single-player quiz sprint with combo multipliers.",
    tone: "iris",
    href: "/games/solo",
    emoji: "⚡",
  },
];

const PREMIUM_MODES = [
  {
    name: "Crypto Hack",
    tag: "Premium",
    body: "Answer questions to mine tokens, hack opponents' passwords, and steal their stash.",
    tone: "coral",
    href: "/games/crypto",
    emoji: "💻",
  },
  {
    name: "Kingdom Manager",
    tag: "Premium",
    body: "Balance Gold, Morale, and Army by making choices through correct answers.",
    tone: "gold",
    href: "/games/kingdom",
    emoji: "👑",
  },
];

const OPEN_SOURCE = [
  "Kahoot-style live rooms",
  "Jeopardy category boards",
  "Quizizz self-paced practice",
  "Flashcard SRS drills",
  "Team boss battles",
  "Trivia ladder modes",
];

export default async function GamesHub() {
  const user = await getCurrentUser();
  const isPremium = user?.isPremium ?? false;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="card overflow-hidden p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="chip border-iris/40 text-iris"><Icon.Game className="h-4 w-4" /> StudyVerse Games</span>
              <h1 className="mt-3 font-display text-3xl font-bold text-ink">Make any quiz into a game</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted">
                Paste notes, upload a file, or build questions manually. Then pick a mode and play solo or host a live room.
              </p>
            </div>
            <Link href="/games/host" className="btn-primary">
              <Icon.Crown className="h-4 w-4" /> Create game
            </Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <QuickLink href="/games/host" icon="Crown" title="Create or import" body="File, notes, or manual" />
            <QuickLink href="/games/solo" icon="Play" title="Solo arcade" body="Timed review sprint" />
            <QuickLink href="/games/join" icon="Bolt" title="Join live room" body="Enter a code" />
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-display font-semibold text-ink">Open-source formats</h2>
          <p className="mt-1 text-sm text-muted">Community-built quiz mechanics you can remix.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {OPEN_SOURCE.map((idea) => <span key={idea} className="chip text-xs">{idea}</span>)}
          </div>
        </section>
      </div>

      {/* Free modes */}
      <section>
        <h2 className="font-display text-xl font-bold text-ink mb-3">Free game modes</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {FREE_MODES.map((m) => <ModeCard key={m.name} {...m} locked={false} />)}
        </div>
      </section>

      {/* Premium modes */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-ink">Premium game modes</h2>
          {!isPremium && (
            <Link href="/premium" className="chip border-gold/40 text-gold text-xs hover:bg-gold/10">
              <Icon.Crown className="h-3 w-3" /> Unlock all modes
            </Link>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {PREMIUM_MODES.map((m) => <ModeCard key={m.name} {...m} locked={!isPremium} />)}
        </div>
      </section>

      {/* Rewards */}
      <section className="card p-5">
        <h2 className="font-display font-semibold text-ink">How rewards work</h2>
        <ul className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
          <li className="flex items-center gap-2"><Icon.Bolt className="h-4 w-4 text-lime" /> Correct answers earn XP toward your next level.</li>
          <li className="flex items-center gap-2"><Icon.Coin className="h-4 w-4 text-gold" /> StudyCoins unlock characters, backgrounds, and nametags.</li>
          <li className="flex items-center gap-2"><Icon.Flame className="h-4 w-4 text-coral" /> Streak combos add bonus points.</li>
          <li className="flex items-center gap-2"><Icon.Crown className="h-4 w-4 text-gold" /> Premium gives 1.5× XP/coins and unlocks all modes.</li>
        </ul>
        <Link href="/shop" className="btn-ghost mt-4 inline-flex">
          <Icon.Coin className="h-4 w-4" /> Open Shop
        </Link>
      </section>
    </div>
  );
}

function QuickLink({ href, icon, title, body }: { href: string; icon: keyof typeof Icon; title: string; body: string }) {
  const C = Icon[icon];
  return (
    <Link href={href} className="rounded-xl border border-border bg-surface-2 p-4 transition hover:border-iris/50">
      <C className="h-5 w-5 text-iris" />
      <div className="mt-2 font-semibold text-ink">{title}</div>
      <div className="text-xs text-muted">{body}</div>
    </Link>
  );
}

function ModeCard({ name, tag, body, tone, href, emoji, locked }: { name: string; tag: string; body: string; tone: string; href: string; emoji: string; locked: boolean }) {
  const toneClass = tone === "gold" ? "border-gold/40 text-gold" : tone === "lime" ? "border-lime/40 text-lime" : tone === "coral" ? "border-coral/40 text-coral" : "border-iris/40 text-iris";
  const CardEl = locked ? "div" : Link;
  return (
    <CardEl href={locked ? undefined! : href} className={`card group p-5 transition ${locked ? "opacity-60" : "hover:-translate-y-0.5 hover:border-iris/40"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-2xl">{emoji}</div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${toneClass}`}>{tag}</span>
      </div>
      <h3 className="mt-2 font-display text-lg font-semibold text-ink">{name}</h3>
      <p className="mt-1 text-sm text-muted">{body}</p>
      {locked ? (
        <Link href="/premium" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-gold">
          <Icon.Crown className="h-4 w-4" /> Unlock with Premium
        </Link>
      ) : (
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-iris">
          Play now <Icon.Arrow className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </span>
      )}
    </CardEl>
  );
}
