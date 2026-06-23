"use client";

import { useState, useEffect, useCallback } from "react";
import { Icon } from "@/components/icons";
import { useUser } from "@/components/user-provider";

const BEHAVIOR_REASONS = [
  "Disrupting class",
  "Late to lesson",
  "Missing homework",
  "Phone in class",
  "Uniform violation",
  "Inappropriate behaviour",
  "Arguing with teacher",
  "Bullying / intimidation",
  "Cheating or plagiarism",
  "Persistent rule-breaking",
  "Disrespect to staff",
  "Vandalism",
  "Custom",
] as const;

const ACHIEVEMENT_REASONS = [
  "Excellent classwork",
  "Outstanding homework",
  "Improved performance",
  "Helping classmates",
  "Going above and beyond",
  "Perfect attendance",
  "Exceptional effort",
  "Creative thinking",
  "Community contribution",
  "Custom",
] as const;

type Tab = "overview" | "behavior" | "achievement";

interface StudentSummary {
  studentName: string;
  behaviorTotal: number;
  achievementTotal: number;
  netBehavior: number;
  needsDetention: boolean;
}

interface Record {
  id: string;
  studentName: string;
  points: number;
  reason: string;
  customReason: string;
  createdAt: string;
}

export default function PointsPage() {
  const { me } = useUser();
  const isTeacher = (me as any)?.role === "teacher";
  const [tab, setTab] = useState<Tab>("overview");
  const [summary, setSummary] = useState<StudentSummary[]>([]);
  const [behaviorRecords, setBehaviorRecords] = useState<Record[]>([]);
  const [achievementRecords, setAchievementRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Behavior form
  const [bStudent, setBStudent] = useState("");
  const [bPoints, setBPoints] = useState(1);
  const [bReason, setBReason] = useState<string>(BEHAVIOR_REASONS[0]);
  const [bCustom, setBCustom] = useState("");

  // Achievement form
  const [aStudent, setAStudent] = useState("");
  const [aPoints, setAPoints] = useState(1);
  const [aReason, setAReason] = useState<string>(ACHIEVEMENT_REASONS[0]);
  const [aCustom, setACustom] = useState("");

  const load = useCallback(async () => {
    const [bRes, aRes] = await Promise.all([
      fetch("/api/teacher/points/behavior").then((r) => r.json()),
      fetch("/api/teacher/points/achievement").then((r) => r.json()),
    ]);
    setSummary(bRes.summary ?? aRes.summary ?? []);
    setBehaviorRecords(bRes.records ?? []);
    setAchievementRecords(aRes.records ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addBehavior(e: React.FormEvent) {
    e.preventDefault();
    if (!bStudent.trim()) return;
    setLoading(true); setError(""); setSuccess("");
    const res = await fetch("/api/teacher/points/behavior", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentName: bStudent, points: bPoints, reason: bReason, customReason: bCustom }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Failed."); return; }
    setSuccess(data.detentionsCreated > 0
      ? `⚠️ ${bStudent} crossed a 5-point threshold — ${data.detentionsCreated} × 30-min detention${data.detentionsCreated > 1 ? "s were" : " was"} automatically created.`
      : `Added ${bPoints} behavior point${bPoints > 1 ? "s" : ""} for ${bStudent}.`
    );
    setBStudent(""); setBPoints(1); setBCustom("");
    await load();
  }

  async function addAchievement(e: React.FormEvent) {
    e.preventDefault();
    if (!aStudent.trim()) return;
    setLoading(true); setError(""); setSuccess("");
    const res = await fetch("/api/teacher/points/achievement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentName: aStudent, points: aPoints, reason: aReason, customReason: aCustom }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Failed."); return; }
    setSuccess(`Awarded ${aPoints} achievement point${aPoints > 1 ? "s" : ""} to ${aStudent}.`);
    setAStudent(""); setAPoints(1); setACustom("");
    await load();
  }

  async function deleteRecord(type: "behavior" | "achievement", id: string) {
    await fetch(`/api/teacher/points/${type}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  // Build autocomplete list of known student names
  const knownStudents = [...new Set([
    ...behaviorRecords.map((r) => r.studentName),
    ...achievementRecords.map((r) => r.studentName),
  ])].sort();

  if (!isTeacher) {
    return (
      <div className="mx-auto max-w-xl text-center py-20">
        <div className="text-4xl mb-4">🔒</div>
        <h1 className="font-display text-xl font-bold text-ink">Teacher mode required</h1>
        <p className="mt-2 text-muted text-sm">Enable Teacher Mode in the Teacher Hub to access this page.</p>
        <a href="/teacher" className="btn-primary mt-6 inline-flex">Go to Teacher Hub</a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Points System</h1>
          <p className="mt-1 text-sm text-muted">
            Track behavior and achievement points. Every 5 net behavior points auto-creates a 30-min detention.
            Every 10 achievement points cancels 1 behavior point.
          </p>
        </div>
        <a href="/teacher" className="btn-ghost text-sm">← Teacher Hub</a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-surface-2 p-1 w-fit">
        {([["overview", "Class Overview"], ["behavior", "Behavior Points"], ["achievement", "Achievement Points"]] as const).map(([t, label]) => (
          <button key={t} onClick={() => { setTab(t); setError(""); setSuccess(""); }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === t ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </div>

      {error && <div className="rounded-xl border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">{error}</div>}
      {success && <div className="rounded-xl border border-lime/40 bg-lime/10 px-3 py-2 text-sm text-lime">{success}</div>}

      {/* ── Overview Tab ── */}
      {tab === "overview" && (
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="chip border-coral/40 text-coral">🔴 Every 5 net behavior pts → a 30-min detention</span>
            <span className="chip border-gold/40 text-gold">🟡 Net behavior 3–4 → warning</span>
            <span className="chip border-lime/40 text-lime">🟢 Net behavior &lt; 3 → all good</span>
            <span className="chip border-iris/40 text-iris">⭐ Every 10 achievement pts cancels 1 behavior pt</span>
          </div>

          {summary.length === 0 ? (
            <div className="card p-8 text-center text-muted">No student data yet. Add behavior or achievement points to see the class overview.</div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2">
                    <th className="px-4 py-3 text-left font-semibold text-ink">Student</th>
                    <th className="px-4 py-3 text-center font-semibold text-coral">Behavior Pts</th>
                    <th className="px-4 py-3 text-center font-semibold text-lime">Achievement Pts</th>
                    <th className="px-4 py-3 text-center font-semibold text-iris">Cancelled</th>
                    <th className="px-4 py-3 text-center font-semibold text-ink">Net Behavior</th>
                    <th className="px-4 py-3 text-center font-semibold text-coral">Detentions</th>
                    <th className="px-4 py-3 text-center font-semibold text-ink">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {summary.map((s) => {
                    const cancelled = Math.floor(s.achievementTotal / 10);
                    const detentionsEarned = Math.floor(s.netBehavior / 5);
                    const toNext = 5 - (s.netBehavior % 5);
                    const statusColor = s.needsDetention ? "text-coral" : s.netBehavior % 5 >= 3 ? "text-gold" : "text-lime";
                    const statusText = s.needsDetention
                      ? `⚠️ ${detentionsEarned} detention${detentionsEarned > 1 ? "s" : ""}`
                      : s.netBehavior % 5 >= 3 ? `⚡ ${toNext} from detention` : "✓ Good";
                    return (
                      <tr key={s.studentName} className={s.needsDetention ? "bg-coral/5" : ""}>
                        <td className="px-4 py-3 font-medium text-ink">{s.studentName}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="chip border-coral/30 text-coral">{s.behaviorTotal}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="chip border-lime/30 text-lime">{s.achievementTotal}</span>
                        </td>
                        <td className="px-4 py-3 text-center text-faint">−{cancelled}</td>
                        <td className="px-4 py-3 text-center font-bold text-ink">{s.netBehavior}</td>
                        <td className="px-4 py-3 text-center">
                          {detentionsEarned > 0
                            ? <span className="chip border-coral/40 text-coral font-bold">{detentionsEarned}×</span>
                            : <span className="text-faint">—</span>}
                        </td>
                        <td className={`px-4 py-3 text-center font-semibold ${statusColor}`}>{statusText}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Behavior Points Tab ── */}
      {tab === "behavior" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          {/* Add form */}
          <div className="card p-5 space-y-4">
            <h2 className="font-display font-semibold text-ink">Award Behavior Points</h2>
            <form onSubmit={addBehavior} className="space-y-3">
              <div>
                <label className="label">Student name</label>
                <input
                  list="known-students-b"
                  className="input"
                  placeholder="e.g. John Smith"
                  value={bStudent}
                  onChange={(e) => setBStudent(e.target.value)}
                  required
                />
                <datalist id="known-students-b">
                  {knownStudents.map((n) => <option key={n} value={n} />)}
                </datalist>
              </div>
              <div>
                <label className="label">Points (1–10)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 5, 10].map((n) => (
                    <button key={n} type="button"
                      onClick={() => setBPoints(n)}
                      className={`chip cursor-pointer transition ${bPoints === n ? "border-coral/60 bg-coral/15 text-coral font-bold" : "hover:border-coral/40"}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Reason</label>
                <select className="input" value={bReason} onChange={(e) => setBReason(e.target.value as any)}>
                  {BEHAVIOR_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {bReason === "Custom" && (
                <div>
                  <label className="label">Custom reason</label>
                  <input className="input" placeholder="Describe the behaviour…" value={bCustom} onChange={(e) => setBCustom(e.target.value)} required />
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                {loading ? "Saving…" : `Add ${bPoints} behavior point${bPoints > 1 ? "s" : ""}`}
              </button>
            </form>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-xs text-amber-400">
              ⚠️ Every 5 net behaviour points triggers a 30-min detention (at 5, 10, 15…) in the Detention Log.
            </div>
          </div>

          {/* Records list */}
          <div className="card p-5 space-y-3">
            <h2 className="font-display font-semibold text-ink">Recent Records</h2>
            {behaviorRecords.length === 0 ? (
              <p className="text-sm text-muted">No behavior points recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {behaviorRecords.map((r) => (
                  <div key={r.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface-2 p-3">
                    <div className="min-w-0">
                      <div className="font-medium text-ink text-sm truncate">{r.studentName}</div>
                      <div className="text-xs text-muted mt-0.5">
                        {r.reason === "Custom" ? r.customReason : r.reason}
                      </div>
                      <div className="text-xs text-faint mt-0.5">{new Date(r.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="chip border-coral/40 text-coral text-xs font-bold">+{r.points}</span>
                      <button onClick={() => deleteRecord("behavior", r.id)} className="btn-ghost h-7 w-7 !px-0 text-faint hover:text-coral">
                        <Icon.X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Achievement Points Tab ── */}
      {tab === "achievement" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          {/* Add form */}
          <div className="card p-5 space-y-4">
            <h2 className="font-display font-semibold text-ink">Award Achievement Points</h2>
            <form onSubmit={addAchievement} className="space-y-3">
              <div>
                <label className="label">Student name</label>
                <input
                  list="known-students-a"
                  className="input"
                  placeholder="e.g. Jane Doe"
                  value={aStudent}
                  onChange={(e) => setAStudent(e.target.value)}
                  required
                />
                <datalist id="known-students-a">
                  {knownStudents.map((n) => <option key={n} value={n} />)}
                </datalist>
              </div>
              <div>
                <label className="label">Points (1–10)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 5, 10].map((n) => (
                    <button key={n} type="button"
                      onClick={() => setAPoints(n)}
                      className={`chip cursor-pointer transition ${aPoints === n ? "border-lime/60 bg-lime/15 text-lime font-bold" : "hover:border-lime/40"}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Reason</label>
                <select className="input" value={aReason} onChange={(e) => setAReason(e.target.value as any)}>
                  {ACHIEVEMENT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {aReason === "Custom" && (
                <div>
                  <label className="label">Custom reason</label>
                  <input className="input" placeholder="Describe the achievement…" value={aCustom} onChange={(e) => setACustom(e.target.value)} required />
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                {loading ? "Saving…" : `Award ${aPoints} achievement point${aPoints > 1 ? "s" : ""}`}
              </button>
            </form>
            <div className="rounded-xl border border-iris/20 bg-iris/8 px-3 py-2 text-xs text-iris">
              ⭐ Every 10 achievement points cancels 1 behavior point for that student.
            </div>
          </div>

          {/* Records list */}
          <div className="card p-5 space-y-3">
            <h2 className="font-display font-semibold text-ink">Recent Records</h2>
            {achievementRecords.length === 0 ? (
              <p className="text-sm text-muted">No achievement points awarded yet.</p>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {achievementRecords.map((r) => (
                  <div key={r.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface-2 p-3">
                    <div className="min-w-0">
                      <div className="font-medium text-ink text-sm truncate">{r.studentName}</div>
                      <div className="text-xs text-muted mt-0.5">
                        {r.reason === "Custom" ? r.customReason : r.reason}
                      </div>
                      <div className="text-xs text-faint mt-0.5">{new Date(r.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="chip border-lime/40 text-lime text-xs font-bold">+{r.points}</span>
                      <button onClick={() => deleteRecord("achievement", r.id)} className="btn-ghost h-7 w-7 !px-0 text-faint hover:text-coral">
                        <Icon.X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
