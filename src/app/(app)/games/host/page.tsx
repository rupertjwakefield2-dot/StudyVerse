"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { useUser } from "@/components/user-provider";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { CodeBadge, Lobby, QuestionView, Leaderboard, type LivePlayer, type LiveQuestion } from "@/components/live";

type Phase = "config" | "lobby" | "question" | "reveal" | "over";

export default function HostPage() {
  const { me } = useUser();
  const [phase, setPhase] = useState<Phase>("config");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [code, setCode] = useState("");
  const [players, setPlayers] = useState<LivePlayer[]>([]);
  const [question, setQuestion] = useState<LiveQuestion | null>(null);
  const [answerIndex, setAnswerIndex] = useState<number | null>(null);
  const [board, setBoard] = useState<LivePlayer[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const countdown = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { disconnectSocket(); if (countdown.current) clearInterval(countdown.current); }, []);

  function startCountdown(ms: number) {
    if (countdown.current) clearInterval(countdown.current);
    setSecondsLeft(Math.round(ms / 1000));
    countdown.current = setInterval(() => setSecondsLeft((s) => (s <= 1 ? 0 : s - 1)), 1000);
  }

  async function createRoom() {
    if (!me) return;
    setLoading(true); setError("");
    try {
      const seed = topic.trim() || "general knowledge";
      const res = await fetch("/api/quiz/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText: `Live quiz on ${seed}. Core ${seed} concepts.`, topic: seed, difficulty, count: 6 }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Couldn't build the quiz."); setLoading(false); return; }

      const socket = getSocket();
      // Wire listeners once.
      socket.off("lobby").on("lobby", (p: { players: LivePlayer[] }) => setPlayers(p.players));
      socket.off("question").on("question", (q: LiveQuestion) => {
        setQuestion(q); setAnswerIndex(null); setPhase("question"); startCountdown(q.durationMs);
      });
      socket.off("reveal").on("reveal", (r: { answerIndex: number; leaderboard: LivePlayer[] }) => {
        setAnswerIndex(r.answerIndex); setBoard(r.leaderboard); setPhase("reveal");
        if (countdown.current) clearInterval(countdown.current);
      });
      socket.off("game:over").on("game:over", (r: { leaderboard: LivePlayer[] }) => { setBoard(r.leaderboard); setPhase("over"); });

      socket.emit("host:create", { nickname: me.name, quiz: data.quiz }, (resp: { code?: string; error?: string }) => {
        if (resp.error || !resp.code) { setError(resp.error || "Failed to create room."); setLoading(false); return; }
        setCode(resp.code); setPhase("lobby"); setLoading(false);
      });
    } catch { setError("Network error."); setLoading(false); }
  }

  function startGame() {
    getSocket().emit("host:start");
  }

  if (phase === "config") {
    return (
      <div className="mx-auto max-w-lg">
        <Link href="/games" className="text-sm text-muted hover:text-ink">← Games</Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">Host a live game</h1>
        <p className="mt-1 text-sm text-muted">Generate a quiz, then share the code. Players join from any device.</p>
        <div className="card mt-5 p-5">
          <label className="label">Quiz topic</label>
          <input className="input mt-1" placeholder="e.g. The Solar System" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <div className="mt-4 flex items-center gap-2">
            <span className="label">Difficulty</span>
            {(["easy", "medium", "hard"] as const).map((d) => (
              <button key={d} onClick={() => setDifficulty(d)} className={`chip capitalize ${difficulty === d ? "border-iris/50 text-iris" : ""}`}>{d}</button>
            ))}
          </div>
          {error && <div className="mt-3 rounded-xl border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">{error}</div>}
          <button onClick={createRoom} disabled={loading} className="btn-primary mt-5 w-full py-3">
            {loading ? "Creating room…" : (<><Icon.Crown className="h-4 w-4" /> Create room</>)}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "lobby") {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <CodeBadge code={code} />
        <Lobby players={players} hostName={me?.name} />
        <button onClick={startGame} disabled={players.length === 0} className="btn-primary w-full py-3">
          <Icon.Play className="h-4 w-4" /> Start game {players.length > 0 && `(${players.length} ready)`}
        </button>
        {players.length === 0 && <p className="text-center text-xs text-faint">At least one player must join first.</p>}
      </div>
    );
  }

  if (phase === "over") {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div className="card p-6 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gold/15 text-gold"><Icon.Crown className="h-7 w-7" /></div>
          <h2 className="mt-3 font-display text-2xl font-bold text-ink">Final results</h2>
        </div>
        <Leaderboard players={board} title="🏆 Final leaderboard" />
        <Link href="/games" className="btn-ghost w-full">Back to games</Link>
      </div>
    );
  }

  // question / reveal (host view — shows the question + live board, doesn't answer)
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {question && <QuestionView q={question} disabled answerIndex={phase === "reveal" ? answerIndex : null} secondsLeft={phase === "question" ? secondsLeft : undefined} />}
      {phase === "reveal" && <Leaderboard players={board} />}
      {phase === "question" && <p className="text-center text-sm text-muted">Players are answering…</p>}
    </div>
  );
}
