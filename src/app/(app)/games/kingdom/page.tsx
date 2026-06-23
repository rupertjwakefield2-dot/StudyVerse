"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";

interface Q { id: string; prompt: string; choices: string[]; answerIndex: number; explanation: string; topic: string; }
type Phase = "setup" | "playing" | "done";

const PER_Q_MS = 20000;
const TOTAL_Q = 8;
const START_STATS = { gold: 100, morale: 75, army: 50 };

const STAT_REWARDS: Record<string, { gold: number; morale: number; army: number }> = {
  correct: { gold: +20, morale: +10, army: +15 },
  wrong: { gold: -15, morale: -20, army: -10 },
};

const TOPICS = ["Medieval history", "World War II", "Roman Empire", "Economics", "Political science", "Geography"];

const SCENARIO_INTROS = [
  "The council convenes in the great hall. Your advisors present the challenge:",
  "A messenger arrives from the frontier with urgent news:",
  "The treasury minister bows before you with a matter of state:",
  "Your general requests an audience about the northern border:",
  "The court wizard presents a riddle that governs the realm:",
  "Trade delegates from the eastern kingdoms pose a question:",
  "The royal academy tests your knowledge for the kingdom's sake:",
  "Your spymaster delivers intelligence requiring your judgment:",
];

export default function KingdomManager() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [sessionId, setSessionId] = useState("");

  const [idx, setIdx] = useState(0);
  const [stats, setStats] = useState({ ...START_STATS });
  const [picked, setPicked] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(PER_Q_MS);
  const [statChange, setStatChange] = useState<{ gold: number; morale: number; army: number } | null>(null);
  const [summary, setSummary] = useState<{ xp: number; coins: number } | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  async function start() {
    const seed = topic.trim() || TOPICS[Math.floor(Math.random() * TOPICS.length)];
    setLoading(true); setError("");
    try {
      const sRes = await fetch("/api/games/session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "kingdom" }),
      });
      const sData = await sRes.json();
      if (!sRes.ok) { setError("Failed to start session."); return; }
      setSessionId(sData.sessionId);

      const res = await fetch("/api/quiz/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText: `Quiz on: ${seed}`, topic: seed, difficulty: "medium", count: TOTAL_Q, kind: "arcade" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Couldn't load questions."); return; }
      setQuestions(data.quiz.questions);
      setPhase("playing"); setIdx(0); setStats({ ...START_STATS }); setPicked(null); setTimeLeft(PER_Q_MS); setStatChange(null);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (phase !== "playing" || picked !== null) return;
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
    const correct = choice === questions[idx]?.answerIndex;
    const delta = STAT_REWARDS[correct ? "correct" : "wrong"];
    setStatChange(delta);
    setStats((s) => ({
      gold: Math.max(0, Math.min(200, s.gold + delta.gold)),
      morale: Math.max(0, Math.min(200, s.morale + delta.morale)),
      army: Math.max(0, Math.min(200, s.army + delta.army)),
    }));
  }

  function next() {
    const nextIdx = idx + 1;
    setStatChange(null);

    // Check for game over (any stat at 0)
    const gameOver = stats.gold <= 0 || stats.morale <= 0 || stats.army <= 0;
    if (gameOver || nextIdx >= TOTAL_Q) {
      finish(!gameOver);
      return;
    }
    setPicked(null);
    setIdx(nextIdx);
  }

  async function finish(survived: boolean) {
    setPhase("done");
    const correctCount = questions.slice(0, idx + 1).filter((_, i) => i < idx || picked === questions[i]?.answerIndex).length;
    const results = questions.slice(0, Math.min(idx + 1, TOTAL_Q)).map((q, i) => ({
      correct: i % 2 === 0, topic: q.topic,
    }));
    const res = await fetch("/api/quiz/attempt", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `Kingdom Manager — ${topic || "mixed"}`, topic: topic || "Mixed", difficulty: "medium", results, sessionId }),
    });
    const data = await res.json();
    const survivalBonus = survived ? Math.floor((stats.gold + stats.morale + stats.army) / 3) : 0;
    setSummary({ xp: data.xp + (survived ? 50 : 0), coins: data.coins + Math.floor(survivalBonus / 10) });
  }

  function statColor(val: number) {
    if (val <= 20) return "bg-coral";
    if (val <= 50) return "bg-gold";
    return "bg-lime";
  }

  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-lg">
        <Link href="/games" className="text-sm text-muted hover:text-ink">← Games</Link>
        <div className="mt-2 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gold/15 text-gold">
            <Icon.Crown className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Kingdom Manager</h1>
            <p className="text-sm text-muted">Answer wisely — wrong choices drain your Gold, Morale, or Army.</p>
          </div>
        </div>
        <div className="mt-2">
          <span className="chip border-gold/40 text-gold"><Icon.Crown className="h-3 w-3" /> Premium mode</span>
        </div>

        <div className="card mt-5 p-5 space-y-4">
          <div>
            <label className="label">Kingdom's scholarly focus</label>
            <input className="input mt-1" placeholder="e.g. Medieval history, Economics…" value={topic} onChange={(e) => setTopic(e.target.value)} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TOPICS.slice(0, 4).map((t) => (
                <button key={t} onClick={() => setTopic(t)} className="chip hover:border-gold/40">{t}</button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-2 p-3">
            <div className="font-semibold text-ink text-sm mb-2">Starting stats</div>
            {[["⚔️ Army", START_STATS.army], ["😄 Morale", START_STATS.morale], ["🪙 Gold", START_STATS.gold]].map(([label, val]) => (
              <div key={String(label)} className="mb-2">
                <div className="flex justify-between text-xs text-muted mb-1"><span>{label}</span><span>{val}/200</span></div>
                <div className="h-2 rounded-full bg-surface overflow-hidden">
                  <div className="h-full bg-lime rounded-full" style={{ width: `${(Number(val) / 200) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

          {error && <div className="rounded-xl border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">{error}</div>}

          <button onClick={start} disabled={loading} className="btn-primary w-full py-3 bg-gold text-black">
            {loading ? "Mustering the court…" : <><Icon.Crown className="h-4 w-4" /> Begin your reign</>}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    const survived = stats.gold > 0 && stats.morale > 0 && stats.army > 0;
    return (
      <div className="mx-auto max-w-md">
        <div className="card relative overflow-hidden p-8 text-center">
          <div className="absolute inset-0 opacity-40" style={{ background: survived ? "radial-gradient(circle at 50% 0,rgba(234,179,8,0.25),transparent 70%)" : "radial-gradient(circle at 50% 0,rgba(239,68,68,0.2),transparent 70%)" }} />
          <div className="relative">
            <div className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl ${survived ? "bg-gold/15 text-gold" : "bg-coral/15 text-coral"}`}>
              <Icon.Crown className="h-8 w-8" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold text-ink">{survived ? "Kingdom prospers! 👑" : "Kingdom fell! ⚔️"}</h2>
            <div className="mt-3 flex justify-center gap-3 text-sm">
              <span>⚔️ {stats.army}</span>
              <span>😄 {stats.morale}</span>
              <span>🪙 {stats.gold}</span>
            </div>
            {summary && (
              <div className="mt-5 flex justify-center gap-3">
                <span className="chip border-gold/40 text-gold">+{summary.xp} XP</span>
                <span className="chip border-gold/40 text-gold">+{summary.coins} coins</span>
              </div>
            )}
            <div className="mt-6 flex justify-center gap-2">
              <button onClick={() => setPhase("setup")} className="btn-primary bg-gold text-black"><Icon.Repeat className="h-4 w-4" /> New reign</button>
              <Link href="/games" className="btn-ghost">Back</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[idx];
  if (!q) return null;
  const intro = SCENARIO_INTROS[idx % SCENARIO_INTROS.length];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Kingdom stats */}
      <div className="card p-4">
        <div className="grid grid-cols-3 gap-3">
          {[["🪙 Gold", stats.gold], ["😄 Morale", stats.morale], ["⚔️ Army", stats.army]].map(([label, val]) => (
            <div key={String(label)}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted">{label}</span>
                <span className={`font-medium ${Number(val) <= 20 ? "text-coral" : "text-ink"}`}>{val}</span>
              </div>
              <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${statColor(Number(val))}`} style={{ width: `${(Number(val) / 200) * 100}%` }} />
              </div>
              {statChange && (
                <div className={`text-xs mt-0.5 font-medium ${(statChange as any)[String(label).slice(3).toLowerCase()] >= 0 ? "text-lime" : "text-coral"}`}>
                  {(statChange as any)[String(label).slice(3).toLowerCase()] >= 0 ? "+" : ""}{(statChange as any)[String(label).slice(3).toLowerCase()]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Progress + Timer */}
      <div className="flex items-center gap-3">
        <span className="chip">Edict {idx + 1}/{TOTAL_Q}</span>
        <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden">
          <div className="h-full rounded-full bg-gold transition-[width] duration-100 ease-linear" style={{ width: `${(timeLeft / PER_Q_MS) * 100}%` }} />
        </div>
      </div>

      {/* Question */}
      <div className="card p-6">
        <p className="text-xs text-muted italic mb-2">{intro}</p>
        <p className="font-display text-lg font-semibold text-ink">{q.prompt}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {q.choices.map((c, i) => {
            const isAnswer = i === q.answerIndex;
            const isPicked = i === picked;
            let cls = "border-border bg-surface-2 hover:border-gold/40";
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
            {statChange && (
              <div className={`rounded-xl border p-3 text-sm mb-2 ${picked === q.answerIndex ? "border-lime/40 bg-lime/10" : "border-coral/40 bg-coral/10"}`}>
                {picked === q.answerIndex
                  ? `👑 Wise choice! Gold ${statChange.gold >= 0 ? "+" : ""}${statChange.gold} · Morale ${statChange.morale >= 0 ? "+" : ""}${statChange.morale} · Army ${statChange.army >= 0 ? "+" : ""}${statChange.army}`
                  : `💀 Poor judgment. Gold ${statChange.gold} · Morale ${statChange.morale} · Army ${statChange.army}`}
              </div>
            )}
            <div className="rounded-xl border border-border bg-surface-2 p-3 text-sm text-muted">
              <span className="font-semibold text-ink">Scholar's note: </span>{q.explanation}
            </div>
            <button onClick={next} className="btn-primary mt-3 w-full bg-gold text-black">
              {idx + 1 >= TOTAL_Q ? "See results" : "Next edict"} <Icon.Arrow className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
