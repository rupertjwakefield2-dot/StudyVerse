"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";

interface Det { id: string; studentName: string; reason: string; date: string; duration: number; notes: string; createdAt: string; }

const REASONS = ["Disrupting class", "Late to lesson", "Missing homework", "Phone in class", "Uniform violation", "Inappropriate behaviour", "Other"];

export default function DetentionLog() {
  const [detentions, setDetentions] = useState<Det[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ studentName: "", reason: "Disrupting class", date: today, duration: 30, notes: "" });
  const [error, setError] = useState("");

  useEffect(() => { loadDetentions(); }, []);

  async function loadDetentions() {
    const res = await fetch("/api/teacher/detention");
    const data = await res.json();
    setDetentions(data.detentions ?? []);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.studentName.trim()) { setError("Student name is required."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/teacher/detention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to save."); return; }
      setForm({ studentName: "", reason: "Disrupting class", date: today, duration: 30, notes: "" });
      await loadDetentions();
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  async function del(id: string) {
    setDeleting(id);
    await fetch("/api/teacher/detention", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDetentions((d) => d.filter((x) => x.id !== id));
    setDeleting(null);
  }

  const upcoming = detentions.filter((d) => d.date >= today);
  const past = detentions.filter((d) => d.date < today);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/teacher" className="text-sm text-muted hover:text-ink">← Teacher Hub</Link>
      </div>
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Detention Log</h1>
        <p className="mt-1 text-sm text-muted">Record student detentions with reasons, dates, and notes.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        {/* Create form */}
        <div className="card p-5">
          <h2 className="font-display font-semibold text-ink mb-4">Log detention</h2>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="label">Student name *</label>
              <input className="input mt-1" placeholder="e.g. John Smith" value={form.studentName} onChange={(e) => setForm({ ...form, studentName: e.target.value })} />
            </div>
            <div>
              <label className="label">Reason</label>
              <select className="input mt-1" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
                {REASONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Date</label>
                <input className="input mt-1" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <label className="label">Duration (min)</label>
                <input className="input mt-1" type="number" min={5} max={480} step={5} value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <label className="label">Additional notes</label>
              <textarea className="input mt-1 min-h-20 resize-y" placeholder="Any additional context…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            {error && <div className="rounded-xl border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full bg-coral">
              {loading ? "Saving…" : <><Icon.Target className="h-4 w-4" /> Log detention</>}
            </button>
          </form>
        </div>

        {/* Detention list */}
        <div className="space-y-4">
          {upcoming.length > 0 && (
            <div>
              <h2 className="font-display font-semibold text-ink mb-2">Upcoming ({upcoming.length})</h2>
              <div className="space-y-2">
                {upcoming.map((d) => <DetCard key={d.id} d={d} onDelete={del} deleting={deleting} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="font-display font-semibold text-muted mb-2 text-sm uppercase tracking-wide">Past ({past.length})</h2>
              <div className="space-y-2">
                {past.slice(0, 10).map((d) => <DetCard key={d.id} d={d} onDelete={del} deleting={deleting} past />)}
              </div>
            </div>
          )}
          {detentions.length === 0 && (
            <div className="card p-8 text-center text-muted text-sm">No detentions logged yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetCard({ d, onDelete, deleting, past }: { d: Det; onDelete: (id: string) => void; deleting: string | null; past?: boolean }) {
  return (
    <div className={`card p-4 flex gap-3 ${past ? "opacity-60" : ""}`}>
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-coral/12 text-coral">
        <Icon.Target className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold text-ink">{d.studentName}</div>
          <button onClick={() => onDelete(d.id)} disabled={deleting === d.id} className="text-faint hover:text-coral shrink-0 transition">
            <Icon.X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-1 flex flex-wrap gap-2 text-xs">
          <span className="chip">{d.reason}</span>
          <span className="chip border-coral/30 text-coral">
            {new Date(d.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {d.duration} min
          </span>
        </div>
        {d.notes && <p className="mt-1.5 text-xs text-muted">{d.notes}</p>}
      </div>
    </div>
  );
}
