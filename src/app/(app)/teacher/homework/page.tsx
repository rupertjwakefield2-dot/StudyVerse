"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";

interface HW { id: string; title: string; description: string; subject: string; dueDate: string | null; classGroup: string; createdAt: string; }

const SUBJECTS = ["Mathematics", "English", "Science", "History", "Geography", "Computer Science", "Art", "PE", "Other"];

export default function HomeworkSetter() {
  const [tasks, setTasks] = useState<HW[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", subject: "Mathematics", dueDate: "", classGroup: "" });
  const [error, setError] = useState("");

  useEffect(() => { loadTasks(); }, []);

  async function loadTasks() {
    const res = await fetch("/api/teacher/homework");
    const data = await res.json();
    setTasks(data.tasks ?? []);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/teacher/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to save."); return; }
      setForm({ title: "", description: "", subject: "Mathematics", dueDate: "", classGroup: "" });
      await loadTasks();
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  async function del(id: string) {
    setDeleting(id);
    await fetch("/api/teacher/homework", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setTasks((t) => t.filter((h) => h.id !== id));
    setDeleting(null);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/teacher" className="text-sm text-muted hover:text-ink">← Teacher Hub</Link>
      </div>
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Homework Setter</h1>
        <p className="mt-1 text-sm text-muted">Create homework assignments for your class groups.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        {/* Create form */}
        <div className="card p-5">
          <h2 className="font-display font-semibold text-ink mb-4">New assignment</h2>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="label">Title *</label>
              <input className="input mt-1" placeholder="e.g. Algebra worksheet — Chapter 3" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="label">Subject</label>
              <select className="input mt-1" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
                {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Class / Group</label>
              <input className="input mt-1" placeholder="e.g. Year 10B, Period 3" value={form.classGroup} onChange={(e) => setForm({ ...form, classGroup: e.target.value })} />
            </div>
            <div>
              <label className="label">Due date</label>
              <input className="input mt-1" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div>
              <label className="label">Instructions / description</label>
              <textarea className="input mt-1 min-h-28 resize-y" placeholder="Describe the task, pages to read, questions to answer…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            {error && <div className="rounded-xl border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Saving…" : <><Icon.Cards className="h-4 w-4" /> Add assignment</>}
            </button>
          </form>
        </div>

        {/* Task list */}
        <div className="space-y-3">
          <h2 className="font-display font-semibold text-ink">{tasks.length} assignment{tasks.length !== 1 ? "s" : ""}</h2>
          {tasks.length === 0 ? (
            <div className="card p-8 text-center text-muted text-sm">No assignments yet — create one on the left.</div>
          ) : tasks.map((t) => (
            <div key={t.id} className="card p-4 flex gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-iris/12 text-iris">
                <Icon.Cards className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-ink truncate">{t.title}</div>
                  <button onClick={() => del(t.id)} disabled={deleting === t.id} className="text-faint hover:text-coral shrink-0 transition">
                    <Icon.X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  <span className="chip">{t.subject}</span>
                  {t.classGroup && <span className="chip">{t.classGroup}</span>}
                  {t.dueDate && <span className="chip border-gold/40 text-gold">Due {new Date(t.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
                </div>
                {t.description && <p className="mt-2 text-sm text-muted line-clamp-2">{t.description}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
