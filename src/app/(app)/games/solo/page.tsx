"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { useUser } from "@/components/user-provider";

interface Q { id: string; prompt: string; choices: string[]; answerIndex: number; explanation: string; topic: string; difficulty?: string; }
type Phase = "setup" | "playing" | "done";
const PER_Q_MS = 15000;

const TOPICS = [
  "Algebra basics", "World capitals", "Cell biology", "The water cycle",
  "Fractions", "Newton's laws", "Shakespeare", "Supply and demand",
];

export default function SoloArcade() {
  const { me, refresh } = useUser();
  const [phase, setPhase] = useState<Phase>("setup");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<Q[]>([]);

  // play state
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(PER_Q_MS);
  const [results, setResults] = useState<{ correct: boolean; topic: string }[]>([]);
  const [summary, setSummary] = useState<{ score: number; total: number; xp: number; coins: number } | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  async function start() {
    const seed = topic.trim() || TOPICS[Math.floor(Math.random() * TOPICS.length)];
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/quiz/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText: `Quiz me on: ${seed}. ${seed} fundamentals and key concepts.`, topic: seed, difficulty, count: 6, kind: "arcade" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Couldn't start the game."); return; }
      setQuestions(data.quiz.questions);
      setPhase("playing"); setIdx(0); setScore(0); setCombo(0); setResults([]); setPicked(null); setTimeLeft(PER_Q_MS);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  // Timer per question
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx]);

  function answer(choice: number) {
    if (picked !== null) return;
    if (tick.current) clearInterval(tick.current);
    setPicked(choice);
    const q = questions[idx];
    const correct = choice === q.answerIndex;
    if (correct) {
      const speed = Math.max(0, timeLeft / PER_Q_MS);
      const pts = Math.round(100 + 100 * speed) + combo * 25;
      setScore((s) => s + pts);
      setCombo((c) => c + 1);
    } else {
      setCombo(0);
    }
    setResults((r) => [...r, { correct, topic: q.topic }]);
  }

  function next() {
    if (idx + 1 >= questions.length) finish();
    else { setIdx(idx + 1); setPicked(null); }
  }

  async function finish() {
    setPhase("done");
    const res = await fetch("/api/quiz/attempt", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `Arcade — ${topic || "mixed"}`, topic: topic || "Mixed", difficulty, results }),
    });
    const data = await res.json();
    setSummary({ score: data.score, total: data.total, xp: data.xp, coins: data.coins });
    refresh();
  }

  // ---- Render ----
  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-lg">
        <Link href="/games" className="text-sm text-muted hover:text-ink">← Games</Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">Solo Arcade</h1>
        <p className="mt-1 text-sm text-muted">Pick a topic (or leave it blank for a surprise) and beat the clock.</p>

        <div className="card mt-5 p-5">
          <label className="label">Topic</label>
          <input className="input mt-1" placeholder="e.g. Photosynthesis, WW2, Quadratics…" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TOPICS.slice(0, 5).map((t) => (
              <button key={t} onClick={() => setTopic(t)} className="chip hover:border-iris/40">{t}</button>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <span className="label">Difficulty</span>
            {(["easy", "medium", "hard"] as const).map((d) => (
              <button key={d} onClick={() => setDifficulty(d)} className={`chip capitalize ${difficulty === d ? "border-iris/50 text-iris" : ""}`}>{d}</button>
            ))}
          </div>

          {error && <div className="mt-3 rounded-xl border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">{error}</div>}

          <button onClick={start} disabled={loading} className="btn-primary mt-5 w-full py-3">
            {loading ? "Building your game…" : (<><Icon.Play className="h-4 w-4" /> Start arcade</>)}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "playing") {
    const q = questions[idx];
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between text-sm">
          <span className="chip">Q{idx + 1}/{questions.length}</span>
          <div className="flex items-center gap-2">
            {combo >= 2 && <span className="chip border-coral/40 text-coral animate-fade-up">🔥 {combo}× combo</span>}
            <span className="chip border-lime/40 text-lime">{score} pts</span>
          </div>
        </div>

        {/* Timer bar */}
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-iris transition-[width] duration-100 ease-linear" style={{ width: `${(timeLeft / PER_Q_MS) * 100}%` }} />
        </div>

        <div className="card mt-4 p-6">
          <p className="font-display text-lg font-semibold text-ink">{q.prompt}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {q.choices.map((c, i) => {
              const isAnswer = i === q.answerIndex;
              const isPicked = i === picked;
              let cls = "border-border bg-surface-2 hover:border-iris/40";
              if (picked !== null) {
                if (isAnswer) cls = "border-lime/50 bg-lime/15 text-lime";
                else if (isPicked) cls = "border-coral/50 bg-coral/15 text-coral";
                else cls = "border-border bg-surface-2 opacity-60";
              }
              return (
                <button key={i} disabled={picked !== null} onClick={() => answer(i)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${cls}`}>
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-border text-xs">{String.fromCharCode(65 + i)}</span>
                  <span className="flex-1">{c}</span>
                  {picked !== null && isAnswer && <Icon.Check className="h-4 w-4" />}
                  {picked !== null && isPicked && !isAnswer && <Icon.X className="h-4 w-4" />}
                </button>
              );
            })}
          </div>

          {picked !== null && (
            <div className="mt-4 animate-fade-up">
              <div className="rounded-xl border border-border bg-surface-2 p-3 text-sm text-muted">
                <span className="font-semibold text-ink">Why: </span>{q.explanation}
              </div>
              <button onClick={next} className="btn-primary mt-3 w-full">
                {idx + 1 >= questions.length ? "See results" : "Next question"} <Icon.Arrow className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // done
  return (
    <div className="mx-auto max-w-md">
      <div className="card relative overflow-hidden p-8 text-center">
        <div className="glow-iris absolute inset-0 opacity-50" />
        <div className="relative">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-lime/15 text-lime">
            <Icon.Bolt className="h-8 w-8" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold text-ink">Game over!</h2>
          {summary ? (
            <>
              <p className="mt-1 text-muted">You scored <span className="font-semibold text-ink">{summary.score}/{summary.total}</span> · {score} points</p>
              <div className="mt-5 flex justify-center gap-3">
                <span className="chip border-lime/40 text-lime">+{summary.xp} XP</span>
                <span className="chip border-gold/40 text-gold">+{summary.coins} coins</span>
              </div>
            </>
          ) : <p className="mt-2 text-muted">Saving your rewards…</p>}
          <div className="mt-6 flex justify-center gap-2">
            <button onClick={() => setPhase("setup")} className="btn-primary"><Icon.Repeat className="h-4 w-4" /> Play again</button>
            <Link href="/games" className="btn-ghost">Back to games</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
