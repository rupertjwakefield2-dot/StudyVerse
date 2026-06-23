"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/icons";
import { useUser } from "@/components/user-provider";

const BENEFITS = [
  { icon: "Bolt", title: "Unlimited everything", body: "No daily caps on tutoring, quizzes, or flashcards." },
  { icon: "Brain", title: "Deeper tutoring modes", body: "Advanced explanations and Socratic deep-dives." },
  { icon: "Mic", title: "Full voice AI tutor", body: "Auto-read explanations with adaptive pace." },
  { icon: "Flame", title: "1.5× XP & coins", body: "Level up faster across every game." },
  { icon: "Crown", title: "All game modes", body: "Unlock Crypto Hack, Kingdom Manager, and more." },
  { icon: "Target", title: "Priority adaptive engine", body: "Smarter weak-topic detection and spaced repetition." },
] as const;

export default function PremiumPage() {
  const { me, refresh } = useUser();
  const params = useSearchParams();
  const success = params.get("success");
  const reason = params.get("reason");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [polling, setPolling] = useState(false);

  // After Stripe redirect back, poll until webhook has set isPremium
  useEffect(() => {
    if (!success || me?.isPremium) return;
    setPolling(true);
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      await refresh();
      if (me?.isPremium || attempts >= 12) {
        clearInterval(interval);
        setPolling(false);
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [success]);

  async function upgrade() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/premium/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Couldn't start checkout."); return; }
      if (data.devBypass) {
        await refresh();
        return;
      }
      window.location.href = data.url;
    } catch { setError("Network error."); }
    finally { setLoading(false); }
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
            <p className="mt-2 text-muted">All game modes, unlimited AI, and 1.5× rewards unlocked.</p>
            <div className="mt-6 grid gap-2 text-left sm:grid-cols-2">
              {BENEFITS.map((b) => (
                <div key={b.title} className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm">
                  <Icon.Check className="h-4 w-4 text-gold" />
                  <span className="text-ink">{b.title}</span>
                </div>
              ))}
            </div>
            <a href="/games" className="btn-primary mt-6 inline-flex bg-gold text-black">
              <Icon.Game className="h-4 w-4" /> Play all game modes
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (polling && success) {
    return (
      <div className="mx-auto max-w-md text-center py-20">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gold/15 text-gold animate-pulse">
          <Icon.Crown className="h-8 w-8" />
        </div>
        <h2 className="mt-4 font-display text-xl font-bold text-ink">Payment confirmed!</h2>
        <p className="mt-2 text-muted">Activating your premium access…</p>
        <div className="mt-4 h-1.5 w-48 mx-auto rounded-full bg-surface-2 overflow-hidden">
          <div className="h-full bg-gold rounded-full animate-pulse" style={{ width: "60%" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {reason === "game" && (
        <div className="mb-6 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold flex items-center gap-2">
          <Icon.Crown className="h-4 w-4 shrink-0" />
          This game mode requires Premium. Upgrade to unlock all modes instantly.
        </div>
      )}

      <div className="text-center">
        <span className="chip mx-auto border-gold/40 bg-gold/10 text-gold">
          <Icon.Crown className="h-4 w-4" /> One-time payment · yours forever
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold text-ink">Unlock StudyVerse Premium</h1>
        <p className="mx-auto mt-2 max-w-lg text-muted">
          A single <span className="font-semibold text-ink">$10</span> payment — no subscription, no renewal — unlocks the full experience permanently.
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
        <div className="mt-6 rounded-xl border border-coral/40 bg-coral/10 px-3 py-2 text-center text-sm text-coral">{error}</div>
      )}

      <div className="card mt-6 border-gold/40 p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="font-display text-4xl font-bold text-ink">$10<span className="text-base font-normal text-faint"> one-time</span></div>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              <li className="flex items-center gap-1.5"><Icon.Check className="h-3.5 w-3.5 text-gold" /> No subscription, no renewal</li>
              <li className="flex items-center gap-1.5"><Icon.Check className="h-3.5 w-3.5 text-gold" /> Instant access on purchase</li>
              <li className="flex items-center gap-1.5"><Icon.Check className="h-3.5 w-3.5 text-gold" /> Secure checkout via Stripe</li>
            </ul>
          </div>
          <div className="flex flex-col items-center gap-2 w-full sm:w-auto">
            <button onClick={upgrade} disabled={loading}
              className="btn-primary w-full sm:w-52 bg-gold py-3 text-base font-bold text-black disabled:opacity-60">
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="h-4 w-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                  Redirecting…
                </span>
              ) : (
                <span className="flex items-center gap-2 justify-center">
                  <Icon.Crown className="h-5 w-5" /> Upgrade to Premium
                </span>
              )}
            </button>
            <p className="text-xs text-faint text-center">
              {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
                ? "You'll be redirected to Stripe's secure checkout."
                : "Dev mode — no Stripe keys, upgrades instantly."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
