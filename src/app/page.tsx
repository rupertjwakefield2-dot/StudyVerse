import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PublicNav } from "@/components/public-nav";
import { Icon } from "@/components/icons";

export default async function Landing() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-bg">
      <PublicNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0 h-[640px]" />
        <div className="glow-iris pointer-events-none absolute inset-x-0 top-0 h-[480px]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 sm:px-6 sm:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="chip mx-auto mb-6 animate-fade-up">
              <Icon.Brain className="h-4 w-4 text-iris" />
              AI tutor · gamified learning · adaptive revision
            </span>
            <h1 className="animate-fade-up font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl">
              Learn faster.
              <br />
              Understand <span className="text-iris">deeply.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl animate-fade-up text-lg leading-relaxed text-muted">
              Synapse is a personal AI tutor that teaches the method — not just the answer — wrapped
              in a game you actually want to keep playing.
            </p>
            <div className="mt-8 flex animate-fade-up items-center justify-center gap-3">
              <Link href="/register" className="btn-primary px-5 py-3 text-base">
                Start learning free
                <Icon.Arrow className="h-4 w-4" />
              </Link>
              <Link href="/login" className="btn-ghost px-5 py-3 text-base">
                I have an account
              </Link>
            </div>
            <p className="mt-4 text-xs text-faint">No credit card. Premium is a one-time $10 unlock.</p>
          </div>

          {/* Mode showcase */}
          <div className="mx-auto mt-16 grid max-w-4xl gap-4 sm:grid-cols-3">
            {[
              { t: "Guided", d: "Every step explained clearly until it clicks.", icon: "Spark", tone: "text-iris" },
              { t: "Hint", d: "Just enough nudge to get you unstuck — you do the thinking.", icon: "Target", tone: "text-lime" },
              { t: "Quiz", d: "It tests you first, so you learn what you actually know.", icon: "Game", tone: "text-coral" },
            ].map((m) => {
              const C = Icon[m.icon as keyof typeof Icon];
              return (
                <div key={m.t} className="card p-5 text-left">
                  <C className={`h-6 w-6 ${m.tone}`} />
                  <div className="mt-3 font-display font-semibold text-ink">{m.t} mode</div>
                  <p className="mt-1 text-sm text-muted">{m.d}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Feature icon="Image" title="Snap or paste anything" body="OCR pulls text from photos of worksheets. Synapse auto-detects subject, topic, and difficulty." />
          <Feature icon="Flame" title="Streaks & XP that stick" body="Earn XP, keep streaks alive, climb levels. Difficulty adapts as you improve." />
          <Feature icon="Cards" title="Spaced-repetition revision" body="Auto-generated flashcards, quizzes, and mock exams resurface weak topics at the right time." />
          <Feature icon="Game" title="Live multiplayer quizzes" body="Host a room, share a code, and battle on the leaderboard — Kahoot energy, built in." />
          <Feature icon="Mic" title="Voice study coach" body="Explanations read aloud with pause, repeat, and slow mode. Learn with your ears." />
          <Feature icon="Crown" title="One-time premium" body="$10 once for unlimited usage, deeper tutoring, voice features, and enhanced rewards." />
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-4xl px-4 pb-24 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-7">
            <div className="label">Free</div>
            <div className="mt-2 font-display text-3xl font-bold">$0</div>
            <ul className="mt-5 space-y-2 text-sm text-muted">
              {["15 AI actions per day", "All learning modes", "Flashcards & quizzes", "Single-player games"].map((f) => (
                <li key={f} className="flex items-center gap-2"><Icon.Check className="h-4 w-4 text-lime" />{f}</li>
              ))}
            </ul>
            <Link href="/register" className="btn-ghost mt-6 w-full">Start free</Link>
          </div>
          <div className="card relative overflow-hidden border-gold/40 p-7">
            <div className="absolute right-4 top-4 chip border-gold/40 bg-gold/10 text-gold">Best value</div>
            <div className="label text-gold">Premium · one-time</div>
            <div className="mt-2 font-display text-3xl font-bold">$10</div>
            <ul className="mt-5 space-y-2 text-sm text-muted">
              {["Unlimited everything", "Advanced explanations", "Full voice AI tutor", "1.5× XP & coin rewards", "Exclusive cosmetics"].map((f) => (
                <li key={f} className="flex items-center gap-2"><Icon.Check className="h-4 w-4 text-gold" />{f}</li>
              ))}
            </ul>
            <Link href="/register" className="btn-primary mt-6 w-full bg-gold text-black">Unlock premium</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-faint">
        Built with Next.js · Synapse — a learning platform demo.
      </footer>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: keyof typeof Icon; title: string; body: string }) {
  const C = Icon[icon];
  return (
    <div className="card group p-6 transition-transform hover:-translate-y-0.5">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-surface-2 text-iris">
        <C className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}
