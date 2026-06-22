"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { useUser } from "@/components/user-provider";

const BENEFITS = [
  { icon: "Bolt", title: "Unlimited everything", body: "No daily caps on tutoring, quizzes, or flashcards. Learn as much as you want." },
  { icon: "Brain", title: "Deeper tutoring modes", body: "Advanced, multi-layered explanations and Socratic deep-dives on hard problems." },
  { icon: "Mic", title: "Full voice AI tutor", body: "Auto-read explanations, adaptive pace, and conversational coaching." },
  { icon: "Flame", title: "1.5× XP & coins", body: "Level up faster and earn enhanced rewards across every game." },
  { icon: "Crown", title: "Exclusive cosmetics", body: "Unlock the legendary Wizard and Phoenix avatars and premium themes." },
  { icon: "Target", title: "Priority adaptive engine", body: "Smarter weak-topic detection and tighter spaced-repetition tuning." },
] as const;

export default function PremiumPage() {
  const { me, refresh } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function upgrade() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/premium/unlock", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't complete the upgrade.");
        return;
      }
      await refresh();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  if (me?.isPremium) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card relative overflow-hidden border-gold/40 p-8 text-center">
          <div className="glow-iris absolute inset-0 opacity-60" />
          <div className="relative">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gold/15 text-gold">
              <Icon.Crown className="h-8 w-8" />
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold text-ink">You're Premium ✨</h1>
            <p className="mt-2 text-muted">Unlimited access unlocked. Go make the most of it.</p>
            <div className="mt-6 grid gap-2 text-left sm:grid-cols-2">
              {BENEFITS.map((b) => (
                <div key={b.title} className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm">
                  <Icon.Check className="h-4 w-4 text-gold" />
                  <span className="text-ink">{b.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <PremiumAssistant />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="text-center">
        <span className="chip mx-auto border-gold/40 bg-gold/10 text-gold">
          <Icon.Crown className="h-4 w-4" /> One-time payment · yours forever
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold text-ink">Unlock Synapse Premium</h1>
        <p className="mx-auto mt-2 max-w-lg text-muted">
          A single <span className="font-semibold text-ink">$10</span> payment — no subscription — unlocks the
          full experience for good.
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {BENEFITS.map((b) => {
          const C = Icon[b.icon];
          return (
            <div key={b.title} className="card p-5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gold/12 text-gold">
                <C className="h-5 w-5" />
              </div>
              <div className="mt-3 font-display font-semibold text-ink">{b.title}</div>
              <p className="mt-1 text-sm text-muted">{b.body}</p>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-coral/40 bg-coral/10 px-3 py-2 text-center text-sm text-coral">
          {error}
        </div>
      )}

      <div className="card mt-6 flex flex-col items-center gap-3 border-gold/40 p-6 text-center">
        <div className="font-display text-4xl font-bold text-ink">$10<span className="text-base font-normal text-faint"> once</span></div>
        <button onClick={upgrade} disabled={loading} className="btn-primary w-full max-w-xs bg-gold py-3 text-black">
          {loading ? "Processing…" : "Upgrade to Premium"}
          {!loading && <Icon.Crown className="h-4 w-4" />}
        </button>
        <p className="text-xs text-faint">
          Demo build: this grants premium instantly. Add Stripe keys in <code className="font-mono">.env</code> for real checkout.
        </p>
      </div>
    </div>
  );
}

function PremiumAssistant() {
  return (
    <div className="card mt-6 p-6">
      <div className="flex items-center gap-2">
        <Icon.Brain className="h-5 w-5 text-gold" />
        <h2 className="font-display font-semibold text-ink">Premium Study Coach</h2>
      </div>
      <p className="mt-1 text-sm text-muted">
        Your dedicated assistant with deeper reasoning and full voice. Head to the tutor — explanations now
        auto-read aloud and go a level deeper on hard problems.
      </p>
      <a href="/tutor" className="btn-primary mt-4 inline-flex bg-gold text-black">
        Open the coach <Icon.Arrow className="h-4 w-4" />
      </a>
    </div>
  );
}
