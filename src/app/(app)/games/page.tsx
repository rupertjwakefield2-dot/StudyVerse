import Link from "next/link";
import { Icon } from "@/components/icons";

export default function GamesHub() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">Games</h1>
      <p className="mt-1 text-sm text-muted">Turn revision into a competition. Earn XP and coins as you play.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <ModeCard
          href="/games/solo"
          icon="Game"
          tone="iris"
          title="Solo Arcade"
          body="Fast, timed questions on any topic. Beat the clock, chain combos, rack up points."
          cta="Play solo"
        />
        <ModeCard
          href="/games/host"
          icon="Crown"
          tone="coral"
          title="Host Live"
          body="Create a room, share the code, and run a live quiz battle with friends or classmates."
          cta="Host a room"
        />
        <ModeCard
          href="/games/join"
          icon="Bolt"
          tone="lime"
          title="Join Live"
          body="Got a room code? Jump into a live game and climb the real-time leaderboard."
          cta="Enter a code"
        />
      </div>

      <div className="card mt-6 p-5">
        <h2 className="font-display font-semibold text-ink">How rewards work</h2>
        <ul className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
          <li className="flex items-center gap-2"><Icon.Bolt className="h-4 w-4 text-lime" /> Correct answers earn XP toward your next level.</li>
          <li className="flex items-center gap-2"><Icon.Coin className="h-4 w-4 text-gold" /> Coins unlock avatars and themes in the shop.</li>
          <li className="flex items-center gap-2"><Icon.Flame className="h-4 w-4 text-coral" /> Answer streaks add bonus points.</li>
          <li className="flex items-center gap-2"><Icon.Crown className="h-4 w-4 text-gold" /> Premium players earn 1.5× on everything.</li>
        </ul>
      </div>
    </div>
  );
}

function ModeCard({ href, icon, tone, title, body, cta }: { href: string; icon: keyof typeof Icon; tone: string; title: string; body: string; cta: string }) {
  const C = Icon[icon];
  return (
    <Link href={href} className="card group flex flex-col p-6 transition hover:-translate-y-0.5 hover:border-iris/40">
      <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-${tone}/12 text-${tone}`}>
        <C className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-1 flex-1 text-sm text-muted">{body}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-iris">
        {cta} <Icon.Arrow className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
