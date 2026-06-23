"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { useUser } from "@/components/user-provider";

interface Student { id: string; name: string; classGroup: string; }

// SIMS Next Gen-style attendance marks
const MARKS = [
  { key: "present",    code: "/", label: "Present",          color: "lime" },
  { key: "late",       code: "L", label: "Late",             color: "gold" },
  { key: "absent",     code: "N", label: "Absent (unauth.)", color: "coral" },
  { key: "authorised", code: "C", label: "Authorised",       color: "iris" },
  { key: "illness",    code: "I", label: "Illness",          color: "iris" },
  { key: "excluded",   code: "E", label: "Excluded",         color: "coral" },
] as const;

const colorClass: Record<string, { on: string; text: string }> = {
  lime:  { on: "bg-lime/20 border-lime/60 text-lime",  text: "text-lime" },
  gold:  { on: "bg-gold/20 border-gold/60 text-gold",  text: "text-gold" },
  coral: { on: "bg-coral/20 border-coral/60 text-coral", text: "text-coral" },
  iris:  { on: "bg-iris/20 border-iris/60 text-iris",  text: "text-iris" },
};

export default function RegisterPage() {
  const { me } = useUser();
  const isTeacher = (me as any)?.role === "teacher";
  const today = new Date().toISOString().slice(0, 10);

  const [groups, setGroups] = useState<string[]>([]);
  const [classGroup, setClassGroup] = useState("My Class");
  const [roster, setRoster] = useState<Student[]>([]);
  const [date, setDate] = useState(today);
  const [session, setSession] = useState<"AM" | "PM">("AM");
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add-students modal state
  const [showAdd, setShowAdd] = useState(false);
  const [bulkNames, setBulkNames] = useState("");
  const [newGroup, setNewGroup] = useState("");

  const loadRoster = useCallback(async (group: string) => {
    const res = await fetch(`/api/teacher/register/roster?classGroup=${encodeURIComponent(group)}`);
    const data = await res.json();
    setRoster(data.roster ?? []);
    if (data.groups?.length) setGroups(data.groups);
  }, []);

  const loadAttendance = useCallback(async (group: string, d: string, s: string) => {
    const res = await fetch(`/api/teacher/register/attendance?classGroup=${encodeURIComponent(group)}&date=${d}&session=${s}`);
    const data = await res.json();
    const m: Record<string, string> = {};
    for (const r of data.records ?? []) m[r.studentName] = r.mark;
    setMarks(m);
  }, []);

  useEffect(() => {
    fetch("/api/teacher/register/roster").then((r) => r.json()).then((d) => {
      if (d.groups?.length) {
        setGroups(d.groups);
        setClassGroup(d.groups[0]);
      }
    });
  }, []);

  useEffect(() => {
    loadRoster(classGroup);
    loadAttendance(classGroup, date, session);
  }, [classGroup, date, session, loadRoster, loadAttendance]);

  function setMark(name: string, mark: string) {
    setMarks((m) => ({ ...m, [name]: mark }));
    setSaved(false);
  }

  function markAll(mark: string) {
    const m: Record<string, string> = {};
    for (const s of roster) m[s.name] = mark;
    setMarks(m);
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    const payload = {
      classGroup, date, session,
      marks: roster.map((s) => ({ studentName: s.name, mark: marks[s.name] || "present" })),
    };
    await fetch("/api/teacher/register/attendance", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function addStudents(e: React.FormEvent) {
    e.preventDefault();
    const group = newGroup.trim() || classGroup;
    await fetch("/api/teacher/register/roster", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names: bulkNames, classGroup: group }),
    });
    setBulkNames(""); setNewGroup(""); setShowAdd(false);
    setClassGroup(group);
    await loadRoster(group);
  }

  async function removeStudent(id: string) {
    await fetch("/api/teacher/register/roster", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await loadRoster(classGroup);
  }

  // Live attendance summary
  const present = roster.filter((s) => (marks[s.name] || "present") === "present").length;
  const late = roster.filter((s) => marks[s.name] === "late").length;
  const absent = roster.filter((s) => ["absent", "authorised", "illness", "excluded"].includes(marks[s.name])).length;

  if (!isTeacher) {
    return (
      <div className="mx-auto max-w-xl text-center py-20">
        <div className="text-4xl mb-4">🔒</div>
        <h1 className="font-display text-xl font-bold text-ink">Teacher mode required</h1>
        <p className="mt-2 text-muted text-sm">Enable Teacher Mode in the Teacher Hub to take the register.</p>
        <Link href="/teacher" className="btn-primary mt-6 inline-flex">Go to Teacher Hub</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link href="/teacher" className="text-sm text-muted hover:text-ink">← Teacher Hub</Link>
        <button onClick={() => setShowAdd(true)} className="btn-ghost text-sm">
          <Icon.Users className="h-4 w-4" /> Manage students
        </button>
      </div>

      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Attendance Register</h1>
        <p className="mt-1 text-sm text-muted">Take the register SIMS-style — tap a mark for each student, then save.</p>
      </div>

      {/* Controls */}
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Class / group</label>
          <select className="input mt-1 min-w-44" value={classGroup} onChange={(e) => setClassGroup(e.target.value)}>
            {(groups.length ? groups : ["My Class"]).map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" className="input mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Session</label>
          <div className="mt-1 flex gap-1 rounded-xl border border-border bg-surface-2 p-1">
            {(["AM", "PM"] as const).map((s) => (
              <button key={s} onClick={() => setSession(s)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${session === s ? "bg-surface text-ink shadow-sm" : "text-muted"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => markAll("present")} className="btn-ghost text-sm whitespace-nowrap">
            <Icon.Check className="h-4 w-4 text-lime" /> All present
          </button>
        </div>
      </div>

      {/* Summary bar */}
      {roster.length > 0 && (
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="chip border-lime/40 text-lime">{present} present</span>
          <span className="chip border-gold/40 text-gold">{late} late</span>
          <span className="chip border-coral/40 text-coral">{absent} absent</span>
          <span className="chip">{roster.length} total</span>
        </div>
      )}

      {/* Register grid */}
      {roster.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-3xl mb-3">📋</div>
          <p className="text-muted text-sm">No students in <strong className="text-ink">{classGroup}</strong> yet.</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary mt-4">
            <Icon.Users className="h-4 w-4" /> Add students
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {roster.map((s, i) => {
            const current = marks[s.name] || "present";
            return (
              <div key={s.id} className="card flex items-center gap-3 p-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-sm font-bold text-muted">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1 font-medium text-ink truncate">{s.name}</div>
                <div className="flex flex-wrap gap-1.5">
                  {MARKS.map((mk) => {
                    const active = current === mk.key;
                    const cc = colorClass[mk.color];
                    return (
                      <button key={mk.key} onClick={() => setMark(s.name, mk.key)} title={mk.label}
                        className={`grid h-9 w-9 place-items-center rounded-lg border text-sm font-bold transition ${
                          active ? cc.on : "border-border bg-surface-2 text-faint hover:border-muted"
                        }`}>
                        {mk.code}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => removeStudent(s.id)} className="text-faint hover:text-coral shrink-0 ml-1 transition" title="Remove from class">
                  <Icon.X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Mark legend */}
      {roster.length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs text-muted">
          {MARKS.map((mk) => (
            <span key={mk.key} className="flex items-center gap-1.5">
              <span className={`grid h-5 w-5 place-items-center rounded border ${colorClass[mk.color].on} text-[10px] font-bold`}>{mk.code}</span>
              {mk.label}
            </span>
          ))}
        </div>
      )}

      {/* Save bar */}
      {roster.length > 0 && (
        <div className="sticky bottom-4 flex items-center justify-end gap-3">
          {saved && <span className="text-sm text-lime flex items-center gap-1"><Icon.Check className="h-4 w-4" /> Register saved</span>}
          <button onClick={save} disabled={saving} className="btn-primary shadow-lg">
            {saving ? "Saving…" : <><Icon.Check className="h-4 w-4" /> Save register</>}
          </button>
        </div>
      )}

      {/* Add students modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAdd(false)} />
          <div className="card relative w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-ink">Add students</h2>
              <button onClick={() => setShowAdd(false)} className="btn-ghost h-8 w-8 !px-0"><Icon.X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={addStudents} className="space-y-3">
              <div>
                <label className="label">Class / group name</label>
                <input className="input mt-1" placeholder={classGroup} value={newGroup} onChange={(e) => setNewGroup(e.target.value)} />
                <p className="text-xs text-faint mt-1">Leave blank to add to "{classGroup}".</p>
              </div>
              <div>
                <label className="label">Student names</label>
                <textarea className="input mt-1 min-h-40 resize-y" placeholder={"One name per line:\nJohn Smith\nJane Doe\nAlex Patel"} value={bulkNames} onChange={(e) => setBulkNames(e.target.value)} required />
                <p className="text-xs text-faint mt-1">Paste a whole class — one name per line or comma-separated.</p>
              </div>
              <button type="submit" className="btn-primary w-full">Add to register</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
