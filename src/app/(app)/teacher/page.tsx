"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { useUser } from "@/components/user-provider";

export default function TeacherDashboard() {
  const { me, refresh } = useUser();
  const isTeacher = (me as any)?.role === "teacher";
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function toggleRole() {
    setLoading(true); setMsg("");
    try {
      const res = await fetch("/api/teacher/role", { method: "POST" });
      const data = await res.json();
      setMsg(data.role === "teacher" ? "Teacher mode enabled." : "Switched back to student mode.");
      await refresh();
    } catch { setMsg("Failed — try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Teacher Hub</h1>
        <p className="mt-1 text-sm text-muted">Tools for setting homework, logging detentions, and humanizing text.</p>
      </div>

      {/* Role toggle */}
      <div className="card p-5 flex items-center justify-between gap-4">
        <div>
          <div className="font-semibold text-ink">
            Current role: <span className={isTeacher ? "text-iris" : "text-lime"}>{isTeacher ? "Teacher" : "Student"}</span>
          </div>
          <p className="text-sm text-muted mt-0.5">Switch between student and teacher mode to access the right tools.</p>
          {msg && <p className="text-sm text-lime mt-1">{msg}</p>}
        </div>
        <button onClick={toggleRole} disabled={loading} className="btn-ghost whitespace-nowrap">
          {loading ? "…" : isTeacher ? "Switch to Student" : "Enable Teacher Mode"}
        </button>
      </div>

      {/* Teacher tools */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/teacher/homework" className={`card group p-5 transition hover:-translate-y-0.5 hover:border-iris/40 ${!isTeacher ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-iris/12 text-iris">
            <Icon.Cards className="h-5 w-5" />
          </div>
          <h3 className="mt-3 font-display font-semibold text-ink">Homework Setter</h3>
          <p className="mt-1 text-sm text-muted">Create and track homework assignments for your class.</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-iris">
            Open <Icon.Arrow className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>

        <Link href="/teacher/detention" className={`card group p-5 transition hover:-translate-y-0.5 hover:border-coral/40 ${!isTeacher ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-coral/12 text-coral">
            <Icon.Target className="h-5 w-5" />
          </div>
          <h3 className="mt-3 font-display font-semibold text-ink">Detention Log</h3>
          <p className="mt-1 text-sm text-muted">Record and manage student detentions with reasons and dates.</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-coral">
            Open <Icon.Arrow className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>

        <Link href="/humanizer" className="card group p-5 transition hover:-translate-y-0.5 hover:border-lime/40">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-lime/12 text-lime">
            <Icon.Spark className="h-5 w-5" />
          </div>
          <h3 className="mt-3 font-display font-semibold text-ink">AI Humanizer</h3>
          <p className="mt-1 text-sm text-muted">Rewrite AI-generated text to sound natural and human.</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-lime">
            Open <Icon.Arrow className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>

      {!isTeacher && (
        <div className="rounded-xl border border-gold/30 bg-gold/10 p-4 text-sm text-gold">
          <Icon.Crown className="h-4 w-4 inline mr-2" />
          Enable Teacher Mode above to unlock Homework Setter and Detention Log.
        </div>
      )}
    </div>
  );
}
