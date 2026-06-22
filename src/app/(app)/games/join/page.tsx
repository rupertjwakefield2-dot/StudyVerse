"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { useUser } from "@/components/user-provider";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { Lobby, QuestionView, Leaderboard, type LivePlayer, type LiveQuestion } from "@/components/live";

type Phase = "join" | "lobby" | "question" | "reveal" | "over";

export default function JoinPage() {
  const { me } = useUser();
  const [phase, setPhase] = useState<Phase>("join");
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");

  const [players, setPlayers] = useState<LivePlayer[]>([]);
  const [question, setQuestion] = useState<LiveQuestion | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [answerIndex, setAnswerIndex] = useState<number | null>(null);
  const [board, setBoard] = useState<LivePlayer[]>([]);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const countdown = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (me && !nickname) setNickname(me.name);
    return () => { disconnectSocket(); if (countdown.current) clearInterval(countdown.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  function startCountdown(ms: number) {
    if (countdown.current) clearInterval(countdown.current);
    setSecondsLeft(Math.round(ms / 1000));
    countdown.current = setInterval(() => setSecondsLeft((s) => (s <= 1 ? 0 : s - 1)), 1000);
  }

  function join() {
    if (!code.trim() || !nickname.trim()) return;
    setError("");
    const socket = getSocket();
    socket.off("lobby").on("lobby", (p: { players: LivePlayer[] }) => setPlayers(p.players));
    socket.off("question").on("question", (q: LiveQuestion) => {
      setQuestion(q); setPicked(null); setAnswerIndex(null); setLastCorrect(null); setPhase("question"); startCountdown(q.durationMs);
    });
    socket.off("answer:ack").on("answer:ack", (a: { correct: boolean; answerIndex: number }) => { setLastCorrect(a.correct); });
    socket.off("reveal").on("reveal", (r: { answerIndex: number; leaderboard: LivePlayer[] }) => {
      setAnswerIndex(r.answerIndex); setBoard(r.leaderboard); setPhase("reveal");
      if (countdown.current) clearInterval(countdown.current);
    });
    socket.off("game:over").on("game:over", (r: { leaderboard: LivePlayer[] }) => { setBoard(r.leaderboard); setPhase("over"); });
    socket.off("room:closed").on("room:closed", (r: { reason: string }) => { setError(r.reason || "Room closed."); setPhase("join"); });

    socket.emit("player:join", { code: code.trim().toUpperCase(), nickname: nickname.trim() }, (resp: { code?: string; title?: string; error?: string }) => {
      if (resp.error) { setError(resp.error); return; }
      setTitle(resp.title || "Live quiz"); setPhase("lobby");
    });
  }

  function answer(i: number) {
    if (picked !== null) return;
    setPicked(i);
    getSocket().emit("player:answer", { choiceIndex: i });
  }

  if (phase === "join") {
    return (
      <div className="mx-auto max-w-sm">
        <Link href="/games" className="text-sm text-muted hover:text-ink">← Games</Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">Join a live game</h1>
        <p className="mt-1 text-sm text-muted">Enter the code your host shared.</p>
        <div className="card mt-5 p-5">
          <label className="label">Room code</label>
          <input className="input mt-1 text-center font-mono text-2xl uppercase tracking-[0.3em]" maxLength={6}
            placeholder="ABC123" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <label className="label mt-4 block">Nickname</label>
          <input className="input mt-1" placeholder="Your name" value={nickname} onChange={(e) => setNickname(e.target.value)} />
          {error && <div className="mt-3 rounded-xl border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">{error}</div>}
          <button onClick={join} disabled={!code.trim() || !nickname.trim()} className="btn-primary mt-5 w-full py-3">
            <Icon.Bolt className="h-4 w-4" /> Join game
          </button>
        </div>
      </div>
    );
  }

  if (phase === "lobby") {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div className="card p-5 text-center">
          <div className="label">You're in</div>
          <div className="mt-1 font-display text-xl font-bold text-ink">{title}</div>
          <p className="mt-1 text-sm text-muted">Waiting for the host to start…</p>
          <div className="mt-3 inline-flex"><span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-iris" /><span className="relative inline-flex h-3 w-3 rounded-full bg-iris" /></span></div>
        </div>
        <Lobby players={players} />
      </div>
    );
  }

  if (phase === "over") {
    const me2 = board.find((p) => p.nickname === nickname.trim());
    const rank = board.findIndex((p) => p.nickname === nickname.trim()) + 1;
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div className="card p-6 text-center">
          <h2 className="font-display text-2xl font-bold text-ink">Game over!</h2>
          {me2 && <p className="mt-1 text-muted">You finished <span className="font-semibold text-ink">#{rank}</span> with {me2.score} points</p>}
        </div>
        <Leaderboard players={board} title="🏆 Final leaderboard" />
        <Link href="/games" className="btn-ghost w-full">Back to games</Link>
      </div>
    );
  }

  // question / reveal
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {question && (
        <QuestionView
          q={question}
          onAnswer={answer}
          picked={picked}
          answerIndex={phase === "reveal" ? answerIndex : null}
          disabled={phase === "reveal" || picked !== null}
          secondsLeft={phase === "question" ? secondsLeft : undefined}
        />
      )}
      {phase === "question" && picked !== null && lastCorrect === null && (
        <p className="text-center text-sm text-muted animate-fade-up">Answer locked in — hang tight…</p>
      )}
      {phase === "reveal" && lastCorrect !== null && (
        <div className={`rounded-xl border p-3 text-center font-medium ${lastCorrect ? "border-lime/40 bg-lime/10 text-lime" : "border-coral/40 bg-coral/10 text-coral"}`}>
          {lastCorrect ? "Correct! 🎉" : "Not this time — keep going!"}
        </div>
      )}
      {phase === "reveal" && <Leaderboard players={board} />}
    </div>
  );
}
