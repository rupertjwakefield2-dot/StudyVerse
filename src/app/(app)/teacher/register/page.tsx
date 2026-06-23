"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { useUser } from "@/components/user-provider";

interface Student { id: string; name: string; classGroup: string; }

// SIMS-accurate attendance codes (DfE / SIMS Lesson Monitor register marks)
const MARKS = [
  { key: "present",    code: "/", label: "Present",            color: "lime" },
  { key: "late",       code: "L", label: "Late (before close)", color: "gold" },
  { key: "illness",    code: "I", label: "Illness",            color: "iris" },
  { key: "authorised", code: "C", label: "Authorised (other)", color: "iris" },
  { key: "absent",     code: "O", label: "Absent (unauth.)",   color: "coral" },
  { key: "excluded",   code: "E", label: "Excluded",           color: "coral" },
] as const;

const colorClass: Record<string, { on: string; text: string }> = {
  lime:  { on: "bg-lime/20 border-lime/60 text-lime",  text: "text-lime" },
  gold:  { on: "bg-gold/20 border-gold/60 text-gold",  text: "text-gold" },
  coral: { on: "bg-coral/20 border-coral/60 text-coral", text: "text-coral" },
  iris:  { on: "bg-iris/20 border-iris/60 text-iris",  text: "text-iris" },
};

// Five teaching periods per day (replaces AM/PM)
const PERIODS = ["P1", "P2", "P3", "P4", "P5"] as const;

// Lateness consequences
const LATE_BP_THRESHOLD = 5;   // more than 5 min late → a behaviour point
const LATE_DT_THRESHOLD = 25;  // 25+ min late → a detention

// SIMS-style pupil avatar colours, derived from the name so they stay stable
const AVATAR_COLORS = ["bg-iris/20 text-iris", "bg-lime/20 text-lime", "bg-gold/20 text-gold", "bg-coral/20 text-coral"];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
// SIMS lists pupils "Surname, Forename"
function simsName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  const surname = parts[parts.length - 1];
  const forenames = parts.slice(0, -1).join(" ");
  return `${surname}, ${forenames}`;
}

export default function RegisterPage() {
  const { me } = useUser();
  const isTeacher = (me as any)?.role === "teacher";
  const today = new Date().toISOString().slice(0, 10);

  const [groups, setGroups] = useState<string[]>([]);
  const [classGroup, setClassGroup] = useState("My Class");
  const [roster, setRoster] = useState<Student[]>([]);
  const [date, setDate] = useState(today);
  const [session, setSession] = useState<string>("P1");
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add-students modal state
  const [showAdd, setShowAdd] = useState(false);
  const [bulkNames, setBulkNames] = useState("");
  const [newGroup, setNewGroup] = useState("");

  // Late (right-click) modal state
  const [lateModal, setLateModal] = useState<{ name: string } | null>(null);
  const [lateMins, setLateMins] = useState(10);
  const [lateBusy, setLateBusy] = useState(false);
  const [toast, setToast] = useState("");

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

  function openLate(name: string) {
    setLateModal({ name });
    setLateMins(10);
  }

  async function submitLate(e: React.FormEvent) {
    e.preventDefault();
    if (!lateModal) return;
    setLateBusy(true);
    try {
      const res = await fetch("/api/teacher/register/late", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentName: lateModal.name, classGroup, date, session, minutes: lateMins }),
      });
      const data = await res.json();
      // Reflect the late mark immediately
      setMark(lateModal.name, "late");
      // Build a result message
      const parts = [`${lateModal.name} marked late (${lateMins} min)`];
      if (data.detention) parts.push("→ 30-min detention issued (25+ min late)");
      else if (data.behaviourPoint) parts.push("→ 1 behaviour point (over 5 min late)");
      if (data.detentionsCreated > 0 && !data.detention) parts.push(`→ ${data.detentionsCreated} threshold detention(s)`);
      setToast(parts.join(" "));
      setTimeout(() => setToast(""), 5000);
      setLateModal(null);
    } finally {
      setLateBusy(false);
    }
  }

  // SIMS-style attendance statistics
  const possible = roster.length;
  const presentCount = roster.filter((s) => (marks[s.name] || "present") === "present").length;
  const late = roster.filter((s) => marks[s.name] === "late").length;
  const authAbsent = roster.filter((s) => ["authorised", "illness"].includes(marks[s.name])).length;
  const unauthAbsent = roster.filter((s) => marks[s.name] === "absent").length;
  const excluded = roster.filter((s) => marks[s.name] === "excluded").length;
  // For attendance %, present + late count as "in attendance"
  const attending = presentCount + late;
  const attendancePct = possible ? Math.round((attending / possible) * 100) : 0;
  // Registration is "complete" once every pupil has an explicit mark
  const registered = roster.filter((s) => marks[s.name] != null).length;
  const registerComplete = possible > 0 && registered === possible;

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

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Attendance Register</h1>
          <p className="mt-1 text-sm text-muted">Tap a mark for each pupil, then save. <span className="text-faint">Right-click a name to log a late arrival.</span></p>
        </div>
        {roster.length > 0 && (
          <div className="flex items-center gap-2">
            {registerComplete ? (
              <span className="chip border-lime/50 bg-lime/10 text-lime font-semibold">
                <Icon.Check className="h-4 w-4" /> Registration complete
              </span>
            ) : (
              <span className="chip border-gold/40 text-gold font-medium">
                {registered}/{possible} registered
              </span>
            )}
          </div>
        )}
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
          <label className="label">Period</label>
          <div className="mt-1 flex gap-1 rounded-xl border border-border bg-surface-2 p-1">
            {PERIODS.map((s) => (
              <button key={s} onClick={() => setSession(s)}
                className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${session === s ? "bg-surface text-ink shadow-sm" : "text-muted"}`}>
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

      {/* SIMS-style registration progress */}
      {roster.length > 0 && (
        <div className="h-2 overflow-hidden rounded-full bg-surface-2">
          <div className={`h-full rounded-full transition-all ${registerComplete ? "bg-lime" : "bg-gold"}`} style={{ width: `${(registered / possible) * 100}%` }} />
        </div>
      )}

      {/* Register grid */}
      {roster.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-3xl mb-3">📋</div>
          <p className="text-muted text-sm">No pupils in <strong className="text-ink">{classGroup}</strong> yet.</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary mt-4">
            <Icon.Users className="h-4 w-4" /> Add pupils
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {roster.map((s, i) => {
            const current = marks[s.name] || "present";
            const isRegistered = marks[s.name] != null;
            return (
              <div key={s.id} className={`flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-0 ${i % 2 ? "bg-surface-2/40" : ""}`}>
                <div className="w-6 shrink-0 text-center text-xs font-semibold text-faint">{i + 1}</div>
                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold ${avatarColor(s.name)}`}>
                  {initials(s.name)}
                </div>
                <div
                  className="min-w-0 flex-1 cursor-context-menu select-none"
                  onContextMenu={(e) => { e.preventDefault(); openLate(s.name); }}
                  title="Right-click to log a late arrival"
                >
                  <div className="font-medium text-ink truncate">{simsName(s.name)}</div>
                  <div className="text-[11px] text-faint">{isRegistered ? "Registered" : "Not yet registered"}</div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {MARKS.map((mk) => {
                    const active = current === mk.key && isRegistered;
                    const cc = colorClass[mk.color];
                    return (
                      <button key={mk.key} onClick={() => setMark(s.name, mk.key)} title={mk.label}
                        className={`grid h-8 w-8 place-items-center rounded-md border text-sm font-bold transition ${
                          active ? cc.on : "border-border bg-surface text-faint hover:border-muted"
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

      {/* SIMS statistics footer */}
      {roster.length > 0 && (
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-ink">Session statistics</h3>
            <span className={`text-sm font-bold ${attendancePct >= 95 ? "text-lime" : attendancePct >= 90 ? "text-gold" : "text-coral"}`}>
              {attendancePct}% attendance
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            <Stat label="Possible" value={possible} tone="ink" />
            <Stat label="Present" value={presentCount} tone="lime" />
            <Stat label="Late" value={late} tone="gold" />
            <Stat label="Auth. abs." value={authAbsent} tone="iris" />
            <Stat label="Unauth. abs." value={unauthAbsent} tone="coral" />
            <Stat label="Excluded" value={excluded} tone="coral" />
          </div>
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

      {/* Late arrival modal (right-click a name) */}
      {lateModal && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setLateModal(null)} />
          <div className="card relative w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display font-semibold text-ink">Log late arrival</h2>
              <button onClick={() => setLateModal(null)} className="btn-ghost h-8 w-8 !px-0"><Icon.X className="h-4 w-4" /></button>
            </div>
            <p className="text-sm text-muted mb-4">{simsName(lateModal.name)}</p>
            <form onSubmit={submitLate} className="space-y-4">
              <div>
                <label className="label">Minutes late</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {[2, 5, 10, 15, 25, 30].map((n) => (
                    <button key={n} type="button" onClick={() => setLateMins(n)}
                      className={`chip cursor-pointer transition ${lateMins === n ? "border-gold/60 bg-gold/15 text-gold font-bold" : "hover:border-gold/40"}`}>
                      {n}m
                    </button>
                  ))}
                </div>
                <input type="number" min={1} max={300} value={lateMins}
                  onChange={(e) => setLateMins(Number(e.target.value))}
                  className="input mt-2 w-28" />
              </div>

              {/* Live consequence preview */}
              <div className={`rounded-xl border px-3 py-2 text-sm ${
                lateMins >= LATE_DT_THRESHOLD ? "border-coral/40 bg-coral/10 text-coral"
                : lateMins > LATE_BP_THRESHOLD ? "border-gold/40 bg-gold/10 text-gold"
                : "border-border bg-surface-2 text-muted"
              }`}>
                {lateMins >= LATE_DT_THRESHOLD
                  ? "⚠️ 25+ min late → a 30-min detention will be issued."
                  : lateMins > LATE_BP_THRESHOLD
                  ? "⚡ Over 5 min late → 1 behaviour point will be added."
                  : "Marked late only — no behaviour point (5 min or under)."}
              </div>

              <button type="submit" disabled={lateBusy} className="btn-primary w-full bg-gold text-black">
                {lateBusy ? "Saving…" : "Log late arrival"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-ink shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "ink" | "lime" | "gold" | "iris" | "coral" }) {
  const tc = tone === "lime" ? "text-lime" : tone === "gold" ? "text-gold" : tone === "iris" ? "text-iris" : tone === "coral" ? "text-coral" : "text-ink";
  return (
    <div className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-center">
      <div className={`font-display text-xl font-bold ${tc}`}>{value}</div>
      <div className="text-[11px] text-muted mt-0.5">{label}</div>
    </div>
  );
}
