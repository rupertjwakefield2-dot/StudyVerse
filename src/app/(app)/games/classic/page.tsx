"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { useUser } from "@/components/user-provider";

interface Q { id: string; prompt: string; choices: string[]; answerIndex: number; explanation: string; topic: string; }
type Phase = "setup" | "playing" | "done";

const PER_Q_MS = 20000;
const TOPICS = ["Algebra", "World History", "Biology", "Physics", "Chemistry", "English Literature", "Geography", "Economics"];

export default function ClassicGame() {
  const { me, refresh } = useUser();
  const [phase, setPhase] = useState<Phase>("setup");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<Q[]>([]);

  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
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
        body: JSON.stringify({
          sourceText: `Generate a ${difficulty} ${seed} quiz with ${count} questions covering key facts, definitions, and concepts.`,
          topic: seed,
          difficulty,
          count,
          kind: "arcade",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Couldn't start the game."); return; }
      setQuestions(data.quiz.questions);
      setPhase("playing"); setIdx(0); setScore(0); setStreak(0); setBestStreak(0);
      setResults([]); setPicked(null); setTimeLeft(PER_Q_MS);
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
  }, [phase, idx]); // eslint-disable-line

  function answer(choice: number) {
    if (picked !== null) return;
    if (tick.current) clearInterval(tick.current);
    setPicked(choice);
    const q = questions[idx];
    const correct = choice === q.answerIndex;
    if (correct) {
      setScore((s) => s + 1);
      setStreak((s) => {
        const next = s + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
    } else {
      setStreak(0);
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
      body: JSON.stringify({
        title: `Classic Trivia — ${topic || "Mixed"}`,
        topic: topic || "Mixed",
        difficulty,
        results,
      }),
    });
    const data = await res.json();
    setSummary({ score: data.score, total: data.total, xp: data.xp, coins: data.coins });
    refresh();
  }

  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-lg">
        <Link href="/games" className="text-sm text-muted hover:text-ink">← Games</Link>
        <div className="mt-2 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-iris/15 text-iris">
            <Icon.Game className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Classic Trivia</h1>
            <p className="text-sm text-muted">Answer questions, beat the clock, build a streak.</p>
          </div>
        </div>

        <div className="card mt-5 p-5 space-y-4">
          <div>
            <label className="label">Topic</label>
            <input
              className="input mt-1"
              placeholder="e.g. World War II, Quadratic equations, Cell biology…"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TOPICS.map((t) => (
                <button key={t} onClick={() => setTopic(t)} className={`chip hover:border-iris/40 ${topic === t ? "border-iris/50 text-iris" : ""}`}>{t}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Difficulty</label>
              <div className="mt-2 flex flex-col gap-1.5">
                {(["easy", "medium", "hard"] as const).map((d) => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`chip capitalize text-left ${difficulty === d ? "border-iris/50 bg-iris/10 text-iris" : ""}`}>{d}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Questions</label>
              <div className="mt-2 flex flex-col gap-1.5">
                {[5, 10, 15].map((n) => (
                  <button key={n} onClick={() => setCount(n)}
                    className={`chip ${count === n ? "border-iris/50 bg-iris/10 text-iris" : ""}`}>{n} questions</button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-2 p-3 text-sm text-muted">
            <span className="font-semibold text-ink">Scoring: </span>
            1 point per correct answer · streaks earn bonus XP · 20 seconds per question
          </div>

          {error && <div className="rounded-xl border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">{error}</div>}

          <button onClick={start} disabled={loading} className="btn-primary w-full py-3">
            {loading ? "Loading questions…" : <><Icon.Play className="h-4 w-4" /> Start game</>}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "playing") {
    const q = questions[idx];
    const SHAPES = ["▲", "◆", "●", "■"];
    const COLORS = ["border-iris/50 bg-iris/10 text-iris", "border-lime/50 bg-lime/10 text-lime",
                    "border-gold/50 bg-gold/10 text-gold", "border-coral/50 bg-coral/10 text-coral"];

    return (
      <div className="mx-auto max-w-2xl">
        {/* HUD */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="chip">{idx + 1} / {questions.length}</span>
            {streak >= 2 && <span className="chip border-coral/40 text-coral animate-fade-up">🔥 {streak} streak</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="chip border-lime/40 text-lime">{score} correct</span>
            <span className="chip border-iris/40 text-iris">{Math.round((timeLeft / PER_Q_MS) * 20)}s</span>
          </div>
        </div>

        {/* Timer bar */}
        <div className="h-2 overflow-hidden rounded-full bg-surface-2 mb-4">
          <div
            className={`h-full rounded-full transition-[width] duration-100 ease-linear ${
              timeLeft > PER_Q_MS * 0.5 ? "bg-iris" : timeLeft > PER_Q_MS * 0.25 ? "bg-gold" : "bg-coral"
            }`}
            style={{ width: `${(timeLeft / PER_Q_MS) * 100}%` }}
          />
        </div>

        <div className="card p-6">
          <p className="font-display text-xl font-semibold text-ink">{q.prompt}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {q.choices.map((c, i) => {
              const isAnswer = i === q.answerIndex;
              const isPicked = i === picked;
              let cls = "border-border bg-surface-2 hover:border-iris/40 hover:bg-iris/5";
              if (picked !== null) {
                if (isAnswer) cls = "border-lime/50 bg-lime/15 text-lime";
                else if (isPicked) cls = "border-coral/50 bg-coral/15 text-coral";
                else cls = "border-border bg-surface-2 opacity-40";
              }
              return (
                <button key={i} disabled={picked !== null} onClick={() => answer(i)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition ${cls}`}>
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-sm ${picked === null ? COLORS[i] : ""}`}>
                    {SHAPES[i]}
                  </span>
                  <span className="flex-1">{c}</span>
                  {picked !== null && isAnswer && <Icon.Check className="h-4 w-4 shrink-0" />}
                  {picked !== null && isPicked && !isAnswer && <Icon.X className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>

          {picked !== null && (
            <div className="mt-4 animate-fade-up space-y-3">
              <div className={`rounded-xl border p-3 text-sm ${picked === q.answerIndex ? "border-lime/40 bg-lime/10 text-lime" : "border-coral/40 bg-coral/10 text-coral"}`}>
                <span className="font-semibold">{picked === q.answerIndex ? "Correct! " : "Not quite — "}</span>
                <span className="text-ink">{q.explanation}</span>
              </div>
              <button onClick={next} className="btn-primary w-full py-3">
                {idx + 1 >= questions.length ? "See final results" : "Next question"} <Icon.Arrow className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Results
  const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;
  const grade = pct >= 90 ? "S" : pct >= 75 ? "A" : pct >= 60 ? "B" : pct >= 45 ? "C" : "D";
  const gradeColor = pct >= 75 ? "text-lime" : pct >= 45 ? "text-gold" : "text-coral";

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="card relative overflow-hidden p-8 text-center">
        <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(circle at 50% 0, ${pct >= 75 ? "rgba(132,204,22,0.3)" : pct >= 45 ? "rgba(234,179,8,0.3)" : "rgba(239,68,68,0.2)"}, transparent 70%)` }} />
        <div className="relative">
          <div className={`mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-surface-2 font-display text-4xl font-black ${gradeColor}`}>
            {grade}
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold text-ink">Game over!</h2>
          <p className="mt-1 text-muted">{score} / {questions.length} correct · best streak {bestStreak}</p>

          {summary ? (
            <div className="mt-5 flex justify-center gap-3">
              <span className="chip border-lime/40 text-lime">+{summary.xp} XP</span>
              <span className="chip border-gold/40 text-gold">+{summary.coins} coins</span>
            </div>
          ) : <p className="mt-3 text-sm text-faint">Saving…</p>}

          <div className="mt-5 flex justify-center gap-2">
            <button onClick={() => setPhase("setup")} className="btn-primary"><Icon.Repeat className="h-4 w-4" /> Play again</button>
            <Link href="/games" className="btn-ghost">Games hub</Link>
          </div>
        </div>
      </div>

      {/* Per-question breakdown */}
      <div className="card p-4">
        <h3 className="font-semibold text-ink text-sm mb-3">Question breakdown</h3>
        <div className="flex flex-wrap gap-1.5">
          {results.map((r, i) => (
            <div key={i} className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${r.correct ? "bg-lime/15 text-lime" : "bg-coral/15 text-coral"}`}>
              {i + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
