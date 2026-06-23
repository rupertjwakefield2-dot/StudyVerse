"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { useUser } from "@/components/user-provider";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { CodeBadge, Lobby, QuestionView, Leaderboard, type LivePlayer, type LiveQuestion } from "@/components/live";

type Phase = "config" | "lobby" | "question" | "reveal" | "over";
type Builder = "material" | "file" | "manual";
type Difficulty = "easy" | "medium" | "hard";

type ManualQuestion = {
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
};

const MODES = ["Classic", "Gold Rush", "Tower Review", "Boss Battle", "Flash Duel", "Homework Sprint"];

const starterQuestions: ManualQuestion[] = [
  { prompt: "", choices: ["", "", "", ""], answerIndex: 0, explanation: "" },
  { prompt: "", choices: ["", "", "", ""], answerIndex: 0, explanation: "" },
  { prompt: "", choices: ["", "", "", ""], answerIndex: 0, explanation: "" },
];

export default function HostPage() {
  const { me } = useUser();
  const [phase, setPhase] = useState<Phase>("config");
  const [builder, setBuilder] = useState<Builder>("material");
  const [gameMode, setGameMode] = useState("Classic");
  const [topic, setTopic] = useState("");
  const [material, setMaterial] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [questionCount, setQuestionCount] = useState(6);
  const [manual, setManual] = useState<ManualQuestion[]>(starterQuestions);
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

  async function readFile(file: File | undefined) {
    if (!file) return;
    if (file.size === 0) { setError("That file is empty — please choose a file with content."); return; }
    const name = file.name.toLowerCase();
    if (name.endsWith(".txt") || name.endsWith(".md")) {
      const text = await file.text();
      setMaterial(text.slice(0, 8000));
    } else if (name.endsWith(".pdf") || name.endsWith(".docx")) {
      setLoading(true); setError("");
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/quiz/parse-file", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Couldn't read file."); return; }
        setMaterial(data.text);
      } finally { setLoading(false); }
    } else {
      setError("Unsupported format. Use .pdf, .docx, or .txt.");
      return;
    }
    if (!topic) setTopic(file.name.replace(/\.[^.]+$/, ""));
  }

  function updateManual(index: number, patch: Partial<ManualQuestion>) {
    setManual((items) => items.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function updateChoice(qIndex: number, choiceIndex: number, value: string) {
    setManual((items) => items.map((q, i) => {
      if (i !== qIndex) return q;
      const choices = q.choices.map((c, ci) => (ci === choiceIndex ? value : c));
      return { ...q, choices };
    }));
  }

  function addManualQuestion() {
    setManual((items) => [...items, { prompt: "", choices: ["", "", "", ""], answerIndex: 0, explanation: "" }]);
  }

  function buildManualQuiz() {
    const questions = manual
      .map((q) => ({
        ...q,
        prompt: q.prompt.trim(),
        choices: q.choices.map((c) => c.trim()),
        explanation: q.explanation.trim() || "Review the correct answer and try the next one.",
        subject: "Custom",
        topic: topic.trim() || "Custom quiz",
      }))
      .filter((q) => q.prompt && q.choices.every(Boolean));

    if (questions.length < 3) throw new Error("Add at least three complete questions.");
    return {
      title: `${gameMode}: ${topic.trim() || "Custom quiz"}`,
      subject: "Custom",
      topic: topic.trim() || "Custom quiz",
      questions,
    };
  }

  async function createRoom() {
    if (!me) return;
    setLoading(true); setError("");
    try {
      let quiz;
      if (builder === "manual") {
        quiz = buildManualQuiz();
      } else {
        const seed = topic.trim() || "general knowledge";
        const sourceText = material.trim() || `Create a ${gameMode} quiz on ${seed}. Focus on key facts, examples, definitions, and likely exam-style misconceptions.`;
        const res = await fetch("/api/quiz/generate", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceText, topic: seed, difficulty, count: questionCount, kind: "arcade" }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Couldn't build the quiz."); setLoading(false); return; }
        quiz = { ...data.quiz, title: `${gameMode}: ${data.quiz.title}` };
      }

      const socket = getSocket();
      socket.off("lobby").on("lobby", (p: { players: LivePlayer[] }) => setPlayers(p.players));
      socket.off("question").on("question", (q: LiveQuestion) => {
        setQuestion(q); setAnswerIndex(null); setPhase("question"); startCountdown(q.durationMs);
      });
      socket.off("reveal").on("reveal", (r: { answerIndex: number; leaderboard: LivePlayer[] }) => {
        setAnswerIndex(r.answerIndex); setBoard(r.leaderboard); setPhase("reveal");
        if (countdown.current) clearInterval(countdown.current);
      });
      socket.off("game:over").on("game:over", (r: { leaderboard: LivePlayer[] }) => { setBoard(r.leaderboard); setPhase("over"); });

      socket.emit("host:create", { nickname: me.name, quiz }, (resp: { code?: string; error?: string }) => {
        if (resp.error || !resp.code) { setError(resp.error || "Failed to create room."); setLoading(false); return; }
        setCode(resp.code); setPhase("lobby"); setLoading(false);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
      setLoading(false);
    }
  }

  function startGame() {
    getSocket().emit("host:start");
  }

  if (phase === "config") {
    return (
      <div className="mx-auto max-w-4xl">
        <Link href="/games" className="text-sm text-muted hover:text-ink">Back to games</Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Create a StudyVerse game</h1>
            <p className="mt-1 text-sm text-muted">Import material, generate questions, or write your own quiz.</p>
          </div>
          {me && !me.isPremium && <Link href="/premium" className="chip border-gold/40 text-gold">Premium unlocks every mode</Link>}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="card p-5">
            <label className="label">Game mode</label>
            <div className="mt-2 grid gap-2">
              {MODES.map((mode) => (
                <button
                  key={mode}
                  onClick={() => setGameMode(mode)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition ${gameMode === mode ? "border-iris/50 bg-iris/10 text-iris" : "border-border bg-surface-2 text-muted hover:text-ink"}`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <label className="label mt-5 block">Difficulty</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["easy", "medium", "hard"] as const).map((d) => (
                <button key={d} onClick={() => setDifficulty(d)} className={`chip capitalize ${difficulty === d ? "border-iris/50 text-iris" : ""}`}>{d}</button>
              ))}
            </div>

            <label className="label mt-5 block">Question count</label>
            <input className="input mt-2" type="number" min={3} max={15} value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} />
          </div>

          <div className="card p-5">
            <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface-2 p-1">
              {(["material", "file", "manual"] as const).map((b) => (
                <button key={b} onClick={() => setBuilder(b)} className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${builder === b ? "bg-iris text-white" : "text-muted hover:text-ink"}`}>
                  {b === "material" ? "Type material" : b === "file" ? "Upload file" : "Make your own"}
                </button>
              ))}
            </div>

            <label className="label mt-5 block">Topic or title</label>
            <input className="input mt-2" placeholder="e.g. Photosynthesis, Macbeth, fractions" value={topic} onChange={(e) => setTopic(e.target.value)} />

            {builder === "file" && (
              <div className="mt-4">
                <label className="label">Upload notes</label>
                <input className="input mt-2" type="file" accept=".txt,.md,.csv" onChange={(e) => readFile(e.target.files?.[0])} />
                <p className="mt-2 text-xs text-faint">Text-based files work best. Paste PDF/Word content into the box below for now.</p>
              </div>
            )}

            {builder !== "manual" ? (
              <div className="mt-4">
                <label className="label">Material</label>
                <textarea className="input mt-2 min-h-44 resize-y" placeholder="Paste class notes, textbook material, homework instructions, or revision points..." value={material} onChange={(e) => setMaterial(e.target.value)} />
              </div>
            ) : (
              <ManualBuilder questions={manual} updateQuestion={updateManual} updateChoice={updateChoice} addQuestion={addManualQuestion} />
            )}

            {error && <div className="mt-3 rounded-xl border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">{error}</div>}
            <button onClick={createRoom} disabled={loading} className="btn-primary mt-5 w-full py-3">
              {loading ? "Creating room..." : (<><Icon.Crown className="h-4 w-4" /> Create room</>)}
            </button>
          </div>
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
        <Leaderboard players={board} title="Final leaderboard" />
        <Link href="/games" className="btn-ghost w-full">Back to games</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {question && <QuestionView q={question} disabled answerIndex={phase === "reveal" ? answerIndex : null} secondsLeft={phase === "question" ? secondsLeft : undefined} />}
      {phase === "reveal" && <Leaderboard players={board} />}
      {phase === "question" && <p className="text-center text-sm text-muted">Players are answering...</p>}
    </div>
  );
}

function ManualBuilder({
  questions,
  updateQuestion,
  updateChoice,
  addQuestion,
}: {
  questions: ManualQuestion[];
  updateQuestion: (index: number, patch: Partial<ManualQuestion>) => void;
  updateChoice: (qIndex: number, choiceIndex: number, value: string) => void;
  addQuestion: () => void;
}) {
  return (
    <div className="mt-4 space-y-3">
      {questions.map((q, i) => (
        <div key={i} className="rounded-xl border border-border bg-surface-2 p-3">
          <div className="mb-2 text-xs font-semibold text-faint">Question {i + 1}</div>
          <input className="input" placeholder="Question prompt" value={q.prompt} onChange={(e) => updateQuestion(i, { prompt: e.target.value })} />
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {q.choices.map((choice, ci) => (
              <input key={ci} className="input" placeholder={`Answer ${ci + 1}`} value={choice} onChange={(e) => updateChoice(i, ci, e.target.value)} />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="label">Correct</span>
            {[0, 1, 2, 3].map((ci) => (
              <button key={ci} onClick={() => updateQuestion(i, { answerIndex: ci })} className={`chip ${q.answerIndex === ci ? "border-lime/40 text-lime" : ""}`}>{String.fromCharCode(65 + ci)}</button>
            ))}
          </div>
          <input className="input mt-2" placeholder="Explanation (optional)" value={q.explanation} onChange={(e) => updateQuestion(i, { explanation: e.target.value })} />
        </div>
      ))}
      <button onClick={addQuestion} className="btn-ghost w-full">Add question</button>
    </div>
  );
}
