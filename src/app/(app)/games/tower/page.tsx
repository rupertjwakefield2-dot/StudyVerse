"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";

interface Q { id: string; prompt: string; choices: string[]; answerIndex: number; explanation: string; topic: string; }
type Phase = "setup" | "playing" | "done";

const PER_Q_MS = 18000;
const MAX_HP = 5;
const WAVES = 2;
const Q_PER_WAVE = 5;

const TOWER_NAMES = ["Wooden Outpost", "Stone Keep", "Iron Fortress", "Crystal Citadel", "Arcane Bastion"];
const TOPICS = ["Algebra", "World History", "Biology cells", "Physics forces", "Chemistry elements", "Shakespeare plays"];

export default function TowerDefense() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [sessionId, setSessionId] = useState("");

  // play state
  const [wave, setWave] = useState(1);
  const [idx, setIdx] = useState(0);
  const [hp, setHp] = useState(MAX_HP);
  const [gold, setGold] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(PER_Q_MS);
  const [showWaveBreak, setShowWaveBreak] = useState(false);
  const [kills, setKills] = useState(0);
  const [summary, setSummary] = useState<{ xp: number; coins: number } | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  async function start() {
    const seed = topic.trim() || TOPICS[Math.floor(Math.random() * TOPICS.length)];
    setLoading(true); setError("");
    try {
      // Claim a session token (anti-farming)
      const sRes = await fetch("/api/games/session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "tower" }),
      });
      const sData = await sRes.json();
      if (!sRes.ok) { setError("Failed to start session."); return; }
      setSessionId(sData.sessionId);

      const res = await fetch("/api/quiz/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText: `Quiz: ${seed}`, topic: seed, difficulty, count: Q_PER_WAVE * WAVES, kind: "arcade" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Couldn't load questions."); return; }
      setQuestions(data.quiz.questions);
      setPhase("playing"); setWave(1); setIdx(0); setHp(MAX_HP); setGold(0); setKills(0); setPicked(null); setTimeLeft(PER_Q_MS);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  const globalIdx = (wave - 1) * Q_PER_WAVE + idx;

  useEffect(() => {
    if (phase !== "playing" || picked !== null || showWaveBreak) return;
    setTimeLeft(PER_Q_MS);
    tick.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 100) { clearInterval(tick.current!); answer(-1); return 0; }
        return t - 100;
      });
    }, 100);
    return () => { if (tick.current) clearInterval(tick.current); };
  }, [phase, idx, wave, showWaveBreak]);

  function answer(choice: number) {
    if (picked !== null) return;
    if (tick.current) clearInterval(tick.current);
    setPicked(choice);
    const correct = choice === questions[globalIdx]?.answerIndex;
    if (correct) {
      const speedBonus = Math.round(50 * (timeLeft / PER_Q_MS));
      setGold((g) => g + 50 + speedBonus);
      setKills((k) => k + 1);
    } else {
      setHp((h) => Math.max(0, h - 1));
    }
  }

  function next() {
    const nextLocalIdx = idx + 1;
    if (hp <= 0) { finish(true); return; }
    if (nextLocalIdx >= Q_PER_WAVE) {
      if (wave >= WAVES) { finish(false); return; }
      setShowWaveBreak(true);
      setPicked(null);
      setIdx(0);
    } else {
      setPicked(null);
      setIdx(nextLocalIdx);
    }
  }

  function startNextWave() {
    setShowWaveBreak(false);
    setWave((w) => w + 1);
  }

  async function finish(gameOver: boolean) {
    setPhase("done");
    const correctCount = kills;
    const totalQ = questions.length;
    const results = questions.slice(0, globalIdx + 1).map((q, i) => ({
      correct: i < kills,
      topic: q.topic,
    }));
    const res = await fetch("/api/quiz/attempt", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Tower Defense — ${topic || "mixed"}`,
        topic: topic || "Mixed", difficulty, results,
        sessionId,
        bonus: gameOver ? 0 : hp * 50,
      }),
    });
    const data = await res.json();
    setSummary({ xp: data.xp, coins: data.coins + (gameOver ? 0 : hp * 10) });
  }

  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-lg">
        <Link href="/games" className="text-sm text-muted hover:text-ink">← Games</Link>
        <div className="mt-2 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-lime/15 text-lime">
            <Icon.Target className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Tower Defense</h1>
            <p className="text-sm text-muted">Answer correctly to defend your base. Wrong answers let enemies through.</p>
          </div>
        </div>

        <div className="card mt-5 p-5 space-y-4">
          <div>
            <label className="label">Topic</label>
            <input className="input mt-1" placeholder="e.g. World War 2, Quadratic equations…" value={topic} onChange={(e) => setTopic(e.target.value)} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TOPICS.slice(0, 4).map((t) => (
                <button key={t} onClick={() => setTopic(t)} className="chip hover:border-lime/40">{t}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Difficulty</label>
            <div className="mt-1 flex gap-2">
              {(["easy", "medium", "hard"] as const).map((d) => (
                <button key={d} onClick={() => setDifficulty(d)} className={`chip capitalize ${difficulty === d ? "border-lime/50 bg-lime/10 text-lime" : ""}`}>{d}</button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-2 p-3 text-sm text-muted">
            <div className="font-semibold text-ink mb-1">How to play</div>
            <ul className="space-y-1 list-disc list-inside">
              <li>You have {MAX_HP} lives ❤️</li>
              <li>Correct answer = enemy defeated + gold earned</li>
              <li>Wrong answer = enemy breaks through = lose 1 life</li>
              <li>{WAVES} waves of {Q_PER_WAVE} enemies each</li>
            </ul>
          </div>

          {error && <div className="rounded-xl border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">{error}</div>}

          <button onClick={start} disabled={loading} className="btn-primary w-full py-3 bg-lime text-black">
            {loading ? "Building waves…" : <><Icon.Play className="h-4 w-4" /> Start defense</>}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    const survived = hp > 0;
    return (
      <div className="mx-auto max-w-md">
        <div className="card relative overflow-hidden p-8 text-center">
          <div className="absolute inset-0 opacity-40" style={{ background: survived ? "radial-gradient(circle at 50% 0,rgba(132,204,22,0.25),transparent 70%)" : "radial-gradient(circle at 50% 0,rgba(239,68,68,0.2),transparent 70%)" }} />
          <div className="relative">
            <div className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl ${survived ? "bg-lime/15 text-lime" : "bg-coral/15 text-coral"}`}>
              <Icon.Target className="h-8 w-8" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold text-ink">{survived ? "Base defended! 🏰" : "Base destroyed! 💥"}</h2>
            <p className="mt-1 text-muted">{kills} enemies defeated · {hp} lives remaining · {gold} gold earned</p>
            {summary && (
              <div className="mt-5 flex justify-center gap-3">
                <span className="chip border-lime/40 text-lime">+{summary.xp} XP</span>
                <span className="chip border-gold/40 text-gold">+{summary.coins} coins</span>
              </div>
            )}
            <div className="mt-6 flex justify-center gap-2">
              <button onClick={() => setPhase("setup")} className="btn-primary bg-lime text-black"><Icon.Repeat className="h-4 w-4" /> Play again</button>
              <Link href="/games" className="btn-ghost">Back</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showWaveBreak) {
    const towerLevel = Math.min(wave, TOWER_NAMES.length);
    return (
      <div className="mx-auto max-w-lg">
        <div className="card p-8 text-center">
          <div className="text-4xl mb-3">🏰</div>
          <h2 className="font-display text-xl font-bold text-ink">Wave {wave} cleared!</h2>
          <p className="mt-1 text-muted">Your tower upgraded to <span className="font-semibold text-lime">{TOWER_NAMES[towerLevel - 1]}</span></p>
          <div className="mt-4 flex items-center justify-center gap-4 text-sm">
            <span className="chip border-gold/40 text-gold">{gold} gold</span>
            <span className="chip">{hp}/{MAX_HP} ❤️</span>
          </div>
          <p className="mt-4 text-sm text-muted">Next wave starts with <span className="text-ink font-medium">{Q_PER_WAVE} new enemies</span>.</p>
          <button onClick={startNextWave} className="btn-primary mt-5 bg-lime text-black">
            <Icon.Play className="h-4 w-4" /> Start wave {wave + 1}
          </button>
        </div>
      </div>
    );
  }

  const q = questions[globalIdx];
  if (!q) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* HUD */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="chip border-lime/40 text-lime">Wave {wave}/{WAVES}</span>
          <span className="chip">Q{idx + 1}/{Q_PER_WAVE}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="chip border-gold/40 text-gold">{gold} 🪙</span>
          <div className="flex gap-0.5">
            {Array.from({ length: MAX_HP }).map((_, i) => (
              <span key={i} className={`text-lg ${i < hp ? "text-coral" : "opacity-20"}`}>❤️</span>
            ))}
          </div>
        </div>
      </div>

      {/* Timer */}
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-lime transition-[width] duration-100 ease-linear" style={{ width: `${(timeLeft / PER_Q_MS) * 100}%` }} />
      </div>

      {/* Enemy indicator */}
      <div className="flex items-center gap-2 text-sm text-muted">
        <span className="text-xl">👾</span>
        <span>Enemy approaching your base…</span>
      </div>

      {/* Question */}
      <div className="card p-6">
        <p className="font-display text-lg font-semibold text-ink">{q.prompt}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {q.choices.map((c, i) => {
            const isAnswer = i === q.answerIndex;
            const isPicked = i === picked;
            let cls = "border-border bg-surface-2 hover:border-lime/40";
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
            <div className={`rounded-xl border p-3 text-sm ${picked === q.answerIndex ? "border-lime/40 bg-lime/10 text-lime" : "border-coral/40 bg-coral/10 text-coral"}`}>
              {picked === q.answerIndex ? "🛡️ Enemy defeated! " : "💥 Enemy broke through! "}
              <span className="text-ink">{q.explanation}</span>
            </div>
            <button onClick={next} className="btn-primary mt-3 w-full bg-lime text-black">
              {idx + 1 >= Q_PER_WAVE && wave >= WAVES ? "See results" : idx + 1 >= Q_PER_WAVE ? `Wave ${wave + 1} →` : "Next enemy"} <Icon.Arrow className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
