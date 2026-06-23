"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";

interface Q { id: string; prompt: string; choices: string[]; answerIndex: number; explanation: string; topic: string; }
type Phase = "setup" | "playing" | "hack" | "done";

const PER_Q_MS = 15000;
const TOTAL_Q = 9; // 3 rounds of 3 + bonus hack every 3rd
const HACK_INTERVAL = 3;

const TOPICS = ["Computer networks", "Cryptography basics", "Binary and hex", "Operating systems", "Cybersecurity", "Data structures"];
const OPPONENT_NAMES = ["n00bHacker", "ByteThief_99", "CryptoKid_X", "HashBreaker", "ShadowBot"];

export default function CryptoHack() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [sessionId, setSessionId] = useState("");

  const [idx, setIdx] = useState(0);
  const [tokens, setTokens] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(PER_Q_MS);
  const [streak, setStreak] = useState(0);
  const [hackOpp, setHackOpp] = useState<{ opponent: string; stash: number } | null>(null);
  const [hackResult, setHackResult] = useState<{ won: boolean; stolen: number } | null>(null);
  const [summary, setSummary] = useState<{ xp: number; coins: number } | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  async function start() {
    const seed = topic.trim() || TOPICS[Math.floor(Math.random() * TOPICS.length)];
    setLoading(true); setError("");
    try {
      const sRes = await fetch("/api/games/session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "crypto" }),
      });
      const sData = await sRes.json();
      if (!sRes.ok) { setError("Failed to start session."); return; }
      setSessionId(sData.sessionId);

      const res = await fetch("/api/quiz/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText: `Quiz: ${seed}`, topic: seed, difficulty: "hard", count: TOTAL_Q + 3, kind: "arcade" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Couldn't load questions."); return; }
      setQuestions(data.quiz.questions);
      setPhase("playing"); setIdx(0); setTokens(0); setStreak(0); setPicked(null); setTimeLeft(PER_Q_MS);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if ((phase !== "playing" && phase !== "hack") || picked !== null) return;
    setTimeLeft(PER_Q_MS);
    tick.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 100) { clearInterval(tick.current!); answer(-1); return 0; }
        return t - 100;
      });
    }, 100);
    return () => { if (tick.current) clearInterval(tick.current); };
  }, [phase, idx]);

  function answer(choice: number) {
    if (picked !== null) return;
    if (tick.current) clearInterval(tick.current);
    setPicked(choice);
    const q = questions[idx];
    const correct = choice === q?.answerIndex;

    if (phase === "hack" && hackOpp) {
      const won = correct;
      const stolen = won ? Math.floor(hackOpp.stash * 0.5) : 0;
      setHackResult({ won, stolen });
      if (won) setTokens((t) => t + stolen);
      return;
    }

    if (correct) {
      const speedBonus = Math.round(5 * (timeLeft / PER_Q_MS));
      const streakBonus = streak >= 2 ? Math.floor(streak * 2) : 0;
      setTokens((t) => t + 10 + speedBonus + streakBonus);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }
  }

  function next() {
    const nextIdx = idx + 1;
    setHackResult(null);
    setHackOpp(null);

    if (nextIdx >= TOTAL_Q) {
      finish();
      return;
    }

    // After every HACK_INTERVAL questions, trigger a hack opportunity
    if (nextIdx % HACK_INTERVAL === 0 && nextIdx < TOTAL_Q) {
      const opponent = OPPONENT_NAMES[Math.floor(Math.random() * OPPONENT_NAMES.length)];
      const stash = Math.floor(tokens * 0.3 + Math.random() * 30 + 10);
      setHackOpp({ opponent, stash });
      setPhase("hack");
    } else {
      setPhase("playing");
    }
    setIdx(nextIdx);
    setPicked(null);
  }

  async function finish() {
    setPhase("done");
    const results = questions.slice(0, TOTAL_Q).map((q, i) => ({ correct: i < Math.ceil(tokens / 12), topic: q.topic }));
    const res = await fetch("/api/quiz/attempt", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `Crypto Hack — ${topic || "mixed"}`, topic: topic || "Mixed", difficulty: "hard", results, sessionId }),
    });
    const data = await res.json();
    setSummary({ xp: data.xp, coins: data.coins + Math.floor(tokens * 0.2) });
  }

  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-lg">
        <Link href="/games" className="text-sm text-muted hover:text-ink">← Games</Link>
        <div className="mt-2 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-iris/15 text-iris">
            <Icon.Spark className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Crypto Hack</h1>
            <p className="text-sm text-muted">Answer questions to mine tokens, then hack opponents to steal their stash.</p>
          </div>
        </div>
        <div className="mt-2">
          <span className="chip border-gold/40 text-gold"><Icon.Crown className="h-3 w-3" /> Premium mode</span>
        </div>

        <div className="card mt-5 p-5 space-y-4">
          <div>
            <label className="label">Topic to crack</label>
            <input className="input mt-1" placeholder="e.g. Cryptography, Networking…" value={topic} onChange={(e) => setTopic(e.target.value)} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TOPICS.slice(0, 4).map((t) => (
                <button key={t} onClick={() => setTopic(t)} className="chip hover:border-iris/40">{t}</button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-2 p-3 text-sm text-muted">
            <div className="font-semibold text-ink mb-1">How it works</div>
            <ul className="space-y-1 list-disc list-inside">
              <li>Answer correctly → mine tokens 🪙</li>
              <li>Speed bonus + combo streak multiplier</li>
              <li>Every 3 questions: Hack an opponent's wallet</li>
              <li>Questions are hard difficulty — big token payouts</li>
            </ul>
          </div>

          {error && <div className="rounded-xl border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">{error}</div>}

          <button onClick={start} disabled={loading} className="btn-primary w-full py-3">
            {loading ? "Initialising hack…" : <><Icon.Bolt className="h-4 w-4" /> Start hacking</>}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="mx-auto max-w-md">
        <div className="card relative overflow-hidden p-8 text-center">
          <div className="absolute inset-0 opacity-40" style={{ background: "radial-gradient(circle at 50% 0,rgba(139,92,246,0.3),transparent 70%)" }} />
          <div className="relative">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-iris/15 text-iris">
              <Icon.Bolt className="h-8 w-8" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold text-ink">Hack complete 💻</h2>
            <p className="mt-1 text-muted">{tokens} tokens mined total</p>
            {summary && (
              <div className="mt-5 flex justify-center gap-3">
                <span className="chip border-iris/40 text-iris">+{summary.xp} XP</span>
                <span className="chip border-gold/40 text-gold">+{summary.coins} coins</span>
              </div>
            )}
            <div className="mt-6 flex justify-center gap-2">
              <button onClick={() => setPhase("setup")} className="btn-primary"><Icon.Repeat className="h-4 w-4" /> Hack again</button>
              <Link href="/games" className="btn-ghost">Back</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[idx];
  if (!q) return null;
  const isHack = phase === "hack";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* HUD */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isHack ? (
            <span className="chip border-coral/40 bg-coral/10 text-coral animate-pulse">⚡ HACK OPPORTUNITY</span>
          ) : (
            <span className="chip">Q{idx + 1}/{TOTAL_Q}</span>
          )}
          {streak >= 2 && <span className="chip border-iris/40 text-iris">🔥 {streak}× streak</span>}
        </div>
        <span className="chip border-gold/40 text-gold">⛏️ {tokens} tokens</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-iris transition-[width] duration-100 ease-linear" style={{ width: `${(timeLeft / PER_Q_MS) * 100}%` }} />
      </div>

      {isHack && hackOpp && (
        <div className="rounded-xl border border-coral/40 bg-coral/10 p-3 text-sm">
          <span className="font-semibold text-ink">{hackOpp.opponent}</span>
          <span className="text-muted"> has </span>
          <span className="font-semibold text-coral">{hackOpp.stash} tokens</span>
          <span className="text-muted"> — answer correctly to steal 50% of their stash!</span>
        </div>
      )}

      <div className="card p-6">
        <p className="font-display text-lg font-semibold text-ink">{q.prompt}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {q.choices.map((c, i) => {
            const isAnswer = i === q.answerIndex;
            const isPicked = i === picked;
            let cls = "border-border bg-surface-2 hover:border-iris/40";
            if (picked !== null) {
              if (isAnswer) cls = "border-lime/50 bg-lime/15 text-lime";
              else if (isPicked) cls = "border-coral/50 bg-coral/15 text-coral";
              else cls = "border-border bg-surface-2 opacity-50";
            }
            return (
              <button key={i} disabled={picked !== null} onClick={() => answer(i)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${cls}`}>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-border text-xs">{String.fromCharCode(65 + i)}</span>
                <span className="flex-1">{c}</span>
                {picked !== null && isAnswer && <Icon.Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <div className="mt-4 animate-fade-up">
            {isHack && hackResult ? (
              <div className={`rounded-xl border p-3 text-sm ${hackResult.won ? "border-lime/40 bg-lime/10" : "border-coral/40 bg-coral/10"}`}>
                {hackResult.won
                  ? `💰 Hacked! Stole ${hackResult.stolen} tokens from ${hackOpp?.opponent}.`
                  : `🛡️ ${hackOpp?.opponent} blocked your hack attempt.`}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-surface-2 p-3 text-sm text-muted">
                <span className="font-semibold text-ink">Why: </span>{q.explanation}
              </div>
            )}
            <button onClick={next} className="btn-primary mt-3 w-full">
              {idx + 1 >= TOTAL_Q ? "See results" : "Continue"} <Icon.Arrow className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
