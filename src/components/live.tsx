"use client";

import { Icon } from "./icons";

export interface LivePlayer { id: string; nickname: string; score: number; streak: number; }
export interface LiveQuestion { index: number; total: number; prompt: string; choices: string[]; durationMs: number; }

const SHAPES = ["▲", "◆", "●", "■"];
const TONES = ["coral", "iris", "lime", "gold"];

export function CodeBadge({ code }: { code: string }) {
  return (
    <div className="card-2 flex items-center justify-between gap-4 p-4">
      <div>
        <div className="label">Join code</div>
        <div className="font-mono text-3xl font-bold tracking-[0.3em] text-ink">{code}</div>
      </div>
      <button
        onClick={() => navigator.clipboard?.writeText(code)}
        className="btn-ghost h-9 text-xs"
        title="Copy code"
      >
        Copy
      </button>
    </div>
  );
}

export function Lobby({ players, hostName }: { players: LivePlayer[]; hostName?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-ink">Players ({players.length})</h3>
        {hostName && <span className="chip">Host: {hostName}</span>}
      </div>
      {players.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Waiting for players to join…</p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {players.map((p) => (
            <span key={p.id} className="chip animate-fade-up border-iris/30 text-ink">{p.nickname}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export function QuestionView({
  q, onAnswer, picked, answerIndex, disabled, secondsLeft,
}: {
  q: LiveQuestion;
  onAnswer?: (i: number) => void;
  picked?: number | null;
  answerIndex?: number | null;
  disabled?: boolean;
  secondsLeft?: number;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="chip">Question {q.index + 1} / {q.total}</span>
        {secondsLeft != null && (
          <span className="chip border-iris/40 text-iris font-mono">{secondsLeft}s</span>
        )}
      </div>
      <div className="card p-6">
        <p className="font-display text-xl font-semibold text-ink">{q.prompt}</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {q.choices.map((c, i) => {
            const tone = TONES[i % TONES.length];
            const isAnswer = answerIndex != null && i === answerIndex;
            const isPicked = picked === i;
            let cls = `border-${tone}/40 bg-${tone}/10 hover:bg-${tone}/20 text-ink`;
            if (answerIndex != null) {
              cls = isAnswer ? "border-lime/50 bg-lime/15 text-lime"
                : isPicked ? "border-coral/50 bg-coral/15 text-coral opacity-90"
                : "border-border bg-surface-2 opacity-50";
            } else if (isPicked) {
              cls = `border-${tone} bg-${tone}/25 text-ink ring-2 ring-${tone}`;
            }
            return (
              <button
                key={i}
                disabled={disabled}
                onClick={() => onAnswer?.(i)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-4 text-left font-medium transition ${cls} disabled:cursor-not-allowed`}
              >
                <span className="text-lg">{SHAPES[i % SHAPES.length]}</span>
                <span className="flex-1">{c}</span>
                {answerIndex != null && isAnswer && <Icon.Check className="h-5 w-5" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function Leaderboard({ players, title = "Leaderboard" }: { players: LivePlayer[]; title?: string }) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="card p-5">
      <h3 className="font-display font-semibold text-ink">{title}</h3>
      <ol className="mt-4 space-y-2">
        {players.map((p, i) => (
          <li key={p.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${i === 0 ? "border-gold/40 bg-gold/10" : "border-border bg-surface-2"}`}>
            <span className="w-6 text-center text-lg">{medals[i] ?? i + 1}</span>
            <span className="flex-1 font-medium text-ink">{p.nickname}</span>
            {p.streak >= 3 && <span className="chip border-coral/40 text-coral">🔥{p.streak}</span>}
            <span className="font-mono font-semibold text-ink">{p.score}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
