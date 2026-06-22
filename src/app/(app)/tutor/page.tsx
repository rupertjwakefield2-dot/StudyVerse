"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { useUser } from "@/components/user-provider";
import { useVoice } from "@/lib/use-voice";
import { runOcr } from "@/lib/ocr";

type Mode = "guided" | "hint" | "quiz";
type Difficulty = "easy" | "medium" | "hard";

interface TutorStep { title: string; detail: string; }
interface TutorResponse {
  mode: Mode; subject: string; topic: string; difficulty: Difficulty;
  restate: string; steps: TutorStep[]; checkQuestion?: string;
  keyIdea: string; followUpTopics: string[]; speech: string;
}

const MODES: { id: Mode; label: string; desc: string; icon: keyof typeof Icon; tone: string }[] = [
  { id: "guided", label: "Guided", desc: "Explain every step", icon: "Spark", tone: "iris" },
  { id: "hint", label: "Hint", desc: "Just a nudge", icon: "Target", tone: "lime" },
  { id: "quiz", label: "Quiz", desc: "Test me first", icon: "Game", tone: "coral" },
];

export default function TutorPage() {
  const { me, refresh } = useUser();
  const voice = useVoice();
  const fileRef = useRef<HTMLInputElement>(null);

  const [question, setQuestion] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [mode, setMode] = useState<Mode>("guided");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [loading, setLoading] = useState(false);
  const [ocrPct, setOcrPct] = useState<number | null>(null);
  const [result, setResult] = useState<TutorResponse | null>(null);
  const [earned, setEarned] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrPct(0);
    setError("");
    try {
      const text = await runOcr(file, setOcrPct);
      setSourceText((prev) => (prev ? prev + "\n" + text : text));
      if (!question) setQuestion(text.slice(0, 240));
    } catch {
      setError("Couldn't read that image. Try a clearer photo or paste the text.");
    } finally {
      setOcrPct(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function ask() {
    if (!question.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setEarned(null);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, mode, difficulty, sourceText: sourceText || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setResult(data.response);
      setEarned(data.earned);
      refresh();
      // Premium gets auto-read; free users can press play.
      if (me?.isPremium && data.response?.speech) voice.speak(data.response.speech);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      {/* Composer */}
      <section>
        <h1 className="font-display text-2xl font-bold text-ink">AI Tutor</h1>
        <p className="mt-1 text-sm text-muted">
          Ask anything, paste material, or snap a photo. Synapse teaches the method.
        </p>

        {/* Mode selector */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          {MODES.map((m) => {
            const C = Icon[m.icon];
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`card-2 flex flex-col items-start gap-1 p-3 text-left transition ${
                  active ? "ring-2 ring-iris" : "hover:border-iris/40"
                }`}
              >
                <C className={`h-5 w-5 text-${m.tone}`} />
                <span className="text-sm font-semibold text-ink">{m.label}</span>
                <span className="text-[11px] text-faint">{m.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Difficulty */}
        <div className="mt-3 flex items-center gap-2">
          <span className="label">Difficulty</span>
          {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`chip capitalize ${difficulty === d ? "border-iris/50 text-iris" : ""}`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Question */}
        <textarea
          className="input mt-3 min-h-[120px] resize-y"
          placeholder="e.g. Solve 3x + 5 = 20, or explain why the sky is blue…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        {/* Material / OCR */}
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <span className="label">Material (optional)</span>
            <button onClick={() => fileRef.current?.click()} className="btn-ghost h-8 text-xs">
              <Icon.Image className="h-4 w-4" /> Upload photo
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
          </div>
          {ocrPct !== null && (
            <div className="mt-2 text-xs text-iris">Reading image… {ocrPct}%</div>
          )}
          <textarea
            className="input mt-1 min-h-[64px] resize-y text-xs"
            placeholder="Paste notes or worksheet text here, or upload a photo to extract it…"
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
          />
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">
            {error}
          </div>
        )}

        <button onClick={ask} disabled={loading || !question.trim()} className="btn-primary mt-4 w-full py-3">
          {loading ? "Thinking…" : (<><Icon.Send className="h-4 w-4" /> Ask Synapse</>)}
        </button>
        {me?.dailyLimit != null && (
          <p className="mt-2 text-center text-xs text-faint">
            {Math.max(0, me.dailyLimit - me.dailyUsed)} free actions left today
          </p>
        )}
      </section>

      {/* Answer panel */}
      <section className="min-h-[300px]">
        {loading && <LoadingPanel />}
        {!loading && !result && <EmptyPanel mode={mode} />}
        {result && (
          <ResultPanel result={result} earned={earned} voice={voice} isPremium={!!me?.isPremium} />
        )}
      </section>
    </div>
  );
}

function ResultPanel({
  result, earned, voice, isPremium,
}: {
  result: TutorResponse; earned: number | null;
  voice: ReturnType<typeof useVoice>; isPremium: boolean;
}) {
  return (
    <div className="card animate-fade-up p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip border-iris/40 text-iris capitalize">{result.mode} mode</span>
        <span className="chip">{result.subject}</span>
        <span className="chip">{result.topic}</span>
        <span className="chip capitalize">{result.difficulty}</span>
        {earned != null && <span className="chip border-lime/40 text-lime">+{earned} XP</span>}
      </div>

      <p className="mt-4 font-display text-lg font-semibold text-ink">{result.restate}</p>

      {/* Voice bar */}
      <VoiceBar voice={voice} text={result.speech} locked={!isPremium} />

      {/* Steps */}
      {result.steps.length > 0 && (
        <ol className="mt-4 space-y-3">
          {result.steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-iris/15 text-xs font-bold text-iris">
                {i + 1}
              </span>
              <div className="tutor-content">
                <h3 className="!mt-0">{s.title}</h3>
                <p className="!my-0.5">{s.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {/* Quiz check question */}
      {result.checkQuestion && (
        <div className="mt-4 rounded-2xl border border-coral/30 bg-coral/10 p-4">
          <div className="label text-coral">Your turn</div>
          <p className="mt-1 text-ink">{result.checkQuestion}</p>
        </div>
      )}

      {/* Key idea */}
      <div className="mt-4 rounded-2xl border border-lime/30 bg-lime/10 p-4">
        <div className="label text-lime">Key idea</div>
        <p className="mt-1 text-ink">{result.keyIdea}</p>
      </div>

      {/* Follow ups */}
      {result.followUpTopics?.length > 0 && (
        <div className="mt-4">
          <div className="label">Revise next</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {result.followUpTopics.map((t) => (
              <span key={t} className="chip">{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VoiceBar({ voice, text, locked }: { voice: ReturnType<typeof useVoice>; text: string; locked: boolean }) {
  if (!voice.supported) return null;
  return (
    <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-surface-2 p-2">
      <Icon.Mic className="ml-1 h-4 w-4 text-iris" />
      <span className="text-xs font-medium text-muted">Voice coach</span>
      <div className="ml-auto flex items-center gap-1">
        {!voice.speaking || voice.paused ? (
          <button onClick={() => (voice.paused ? voice.resume() : voice.speak(text))} className="btn-ghost h-8 w-8 !px-0" title="Play">
            <Icon.Play className="h-4 w-4" />
          </button>
        ) : (
          <button onClick={voice.pause} className="btn-ghost h-8 w-8 !px-0" title="Pause">
            <Icon.Pause className="h-4 w-4" />
          </button>
        )}
        <button onClick={voice.repeat} className="btn-ghost h-8 w-8 !px-0" title="Repeat">
          <Icon.Repeat className="h-4 w-4" />
        </button>
        <button
          onClick={voice.slow}
          className={`btn-ghost h-8 w-8 !px-0 ${voice.rate < 1 ? "text-iris" : ""}`}
          title="Slow mode"
        >
          <Icon.Turtle className="h-4 w-4" />
        </button>
      </div>
      {locked && <span className="ml-1 text-[10px] text-gold">Premium auto-reads</span>}
    </div>
  );
}

function EmptyPanel({ mode }: { mode: Mode }) {
  const copy =
    mode === "hint" ? "Hint mode gives you clues — not the answer. You stay in the driver's seat."
    : mode === "quiz" ? "Quiz mode flips it around: Synapse asks you a question first."
    : "Guided mode walks you through every step until it clicks.";
  return (
    <div className="card grid min-h-[300px] place-items-center p-8 text-center">
      <div>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-iris/12 text-iris">
          <Icon.Brain className="h-7 w-7" />
        </div>
        <p className="mt-4 font-display text-lg font-semibold text-ink">Ready when you are</p>
        <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{copy}</p>
      </div>
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="card space-y-3 p-5">
      <div className="skeleton h-6 w-1/3 rounded-lg" />
      <div className="skeleton h-5 w-2/3 rounded-lg" />
      <div className="skeleton h-24 w-full rounded-xl" />
      <div className="skeleton h-16 w-full rounded-xl" />
    </div>
  );
}
