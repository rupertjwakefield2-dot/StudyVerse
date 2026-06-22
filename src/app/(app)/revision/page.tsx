"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { useUser } from "@/components/user-provider";
import { runOcr } from "@/lib/ocr";

interface Card { id: string; front: string; back: string; topic: string; subject: string; }
interface SetRow { id: string; title: string; subject: string; count: number; due: number; }

export default function RevisionPage() {
  const [tab, setTab] = useState<"review" | "create">("review");
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Revision</h1>
          <p className="mt-1 text-sm text-muted">Spaced repetition keeps it in long-term memory.</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-border bg-surface-2 p-1">
          <TabBtn active={tab === "review"} onClick={() => setTab("review")}>Review</TabBtn>
          <TabBtn active={tab === "create"} onClick={() => setTab("create")}>Create set</TabBtn>
        </div>
      </div>

      <div className="mt-6">{tab === "review" ? <ReviewTab /> : <CreateTab />}</div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${active ? "bg-iris text-white" : "text-muted hover:text-ink"}`}>
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
function ReviewTab() {
  const { refresh } = useUser();
  const [sets, setSets] = useState<SetRow[] | null>(null);
  const [cards, setCards] = useState<Card[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);

  const loadSets = () => fetch("/api/sets").then((r) => r.json()).then((d) => setSets(d.sets));
  useEffect(() => { loadSets(); }, []);

  async function startSession(setId?: string) {
    const url = setId ? `/api/flashcards/due?setId=${setId}` : "/api/flashcards/due";
    const d = await (await fetch(url)).json();
    setCards(d.cards);
    setIdx(0); setFlipped(false); setDone(0);
  }

  async function grade(g: number) {
    if (!cards) return;
    const card = cards[idx];
    await fetch("/api/flashcards/review", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: card.id, grade: g }),
    });
    refresh();
    setDone((n) => n + 1);
    if (idx + 1 >= cards.length) {
      setCards([]); // finished
      loadSets();
    } else {
      setIdx(idx + 1); setFlipped(false);
    }
  }

  // Active review session
  if (cards && cards.length > 0) {
    const card = cards[idx];
    return (
      <div className="mx-auto max-w-xl">
        <div className="mb-3 flex items-center justify-between text-sm text-muted">
          <span>Card {idx + 1} / {cards.length}</span>
          <span className="chip">{card.topic}</span>
        </div>
        <button
          onClick={() => setFlipped((f) => !f)}
          className="card flex min-h-[260px] w-full flex-col items-center justify-center gap-3 p-8 text-center transition hover:border-iris/40"
        >
          <span className="label">{flipped ? "Answer" : "Question"}</span>
          <span className="font-display text-xl font-semibold text-ink">{flipped ? card.back : card.front}</span>
          {!flipped && <span className="mt-2 text-xs text-faint">Tap to reveal</span>}
        </button>

        {flipped ? (
          <div className="mt-4 grid grid-cols-4 gap-2">
            <GradeBtn label="Again" tone="coral" onClick={() => grade(2)} />
            <GradeBtn label="Hard" tone="gold" onClick={() => grade(3)} />
            <GradeBtn label="Good" tone="iris" onClick={() => grade(4)} />
            <GradeBtn label="Easy" tone="lime" onClick={() => grade(5)} />
          </div>
        ) : (
          <button onClick={() => setFlipped(true)} className="btn-primary mt-4 w-full">Reveal answer</button>
        )}
      </div>
    );
  }

  // Finished a session
  if (cards && cards.length === 0 && done > 0) {
    return (
      <div className="mx-auto max-w-md card p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-lime/15 text-lime">
          <Icon.Check className="h-7 w-7" />
        </div>
        <h2 className="mt-4 font-display text-xl font-bold text-ink">Session complete</h2>
        <p className="mt-1 text-muted">You reviewed {done} card{done === 1 ? "" : "s"}. Nicely done.</p>
        <button onClick={() => { setCards(null); setDone(0); }} className="btn-primary mt-5">Back to sets</button>
      </div>
    );
  }

  // Set list
  return (
    <div>
      <button onClick={() => startSession()} className="btn-primary mb-4">
        <Icon.Cards className="h-4 w-4" /> Review all due cards
      </button>
      {!sets ? (
        <div className="grid gap-3 sm:grid-cols-2">{[0,1,2,3].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
      ) : sets.length === 0 ? (
        <div className="card p-8 text-center text-muted">No study sets yet. Switch to <strong className="text-ink">Create set</strong> to build one from your notes.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sets.map((s) => (
            <button key={s.id} onClick={() => startSession(s.id)} className="card p-5 text-left transition hover:-translate-y-0.5 hover:border-iris/40">
              <div className="flex items-start justify-between">
                <div className="font-display font-semibold text-ink">{s.title}</div>
                {s.due > 0 && <span className="chip border-coral/40 text-coral">{s.due} due</span>}
              </div>
              <div className="mt-2 flex gap-2 text-xs text-faint">
                <span className="chip">{s.subject}</span>
                <span className="chip">{s.count} cards</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GradeBtn({ label, tone, onClick }: { label: string; tone: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`btn border border-${tone}/40 bg-${tone}/10 text-${tone} hover:bg-${tone}/20`}>
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
function CreateTab() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [count, setCount] = useState(8);
  const [busy, setBusy] = useState(false);
  const [ocrPct, setOcrPct] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrPct(0);
    try {
      const t = await runOcr(file, setOcrPct);
      setText((p) => (p ? p + "\n" + t : t));
    } catch { setError("Couldn't read that image."); }
    finally { setOcrPct(null); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function generate(kind: "flashcards" | "quiz") {
    if (!text.trim()) return;
    setBusy(true); setMsg(""); setError("");
    try {
      const endpoint = kind === "flashcards" ? "/api/flashcards/generate" : "/api/quiz/generate";
      const body = kind === "flashcards"
        ? { sourceText: text, title: title || undefined, count, save: true }
        : { sourceText: text, count, save: true, kind: "quiz" };
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Generation failed."); return; }
      setMsg(kind === "flashcards"
        ? `Created a study set with ${data.result.cards.length} cards. Find it under Review.`
        : `Generated a ${data.quiz.questions.length}-question quiz. Play it in Games.`);
      if (kind === "flashcards") setText("");
    } catch { setError("Network error."); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card p-5">
        <label className="label">Set title (optional)</label>
        <input className="input mt-1" placeholder="e.g. Photosynthesis — Chapter 4" value={title} onChange={(e) => setTitle(e.target.value)} />

        <div className="mt-4 flex items-center justify-between">
          <label className="label">Material</label>
          <button onClick={() => fileRef.current?.click()} className="btn-ghost h-8 text-xs">
            <Icon.Image className="h-4 w-4" /> Upload photo
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
        </div>
        {ocrPct !== null && <div className="mt-1 text-xs text-iris">Reading image… {ocrPct}%</div>}
        <textarea className="input mt-1 min-h-[180px] resize-y" placeholder="Paste your notes, a textbook passage, or upload a photo…" value={text} onChange={(e) => setText(e.target.value)} />

        <div className="mt-3 flex items-center gap-2">
          <span className="label">How many</span>
          {[6, 8, 12].map((n) => (
            <button key={n} onClick={() => setCount(n)} className={`chip ${count === n ? "border-iris/50 text-iris" : ""}`}>{n}</button>
          ))}
        </div>

        {error && <div className="mt-3 rounded-xl border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">{error}</div>}
        {msg && <div className="mt-3 rounded-xl border border-lime/40 bg-lime/10 px-3 py-2 text-sm text-lime">{msg}</div>}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => generate("flashcards")} disabled={busy || !text.trim()} className="btn-primary py-3">
            <Icon.Cards className="h-4 w-4" /> {busy ? "Working…" : "Make flashcards"}
          </button>
          <button onClick={() => generate("quiz")} disabled={busy || !text.trim()} className="btn-ghost py-3">
            <Icon.Game className="h-4 w-4" /> Make a quiz
          </button>
        </div>
      </div>
    </div>
  );
}
