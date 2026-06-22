"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "./brand";
import { Icon } from "./icons";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isRegister = mode === "register";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error — is the server running?");
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left visual panel */}
      <div className="relative hidden overflow-hidden border-r border-border bg-surface lg:block">
        <div className="bg-grid absolute inset-0" />
        <div className="glow-iris absolute inset-0" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Logo />
          <div>
            <h2 className="font-display text-3xl font-bold leading-tight text-ink">
              The tutor that
              <br />
              teaches you to think.
            </h2>
            <p className="mt-3 max-w-sm text-muted">
              Step-by-step explanations, adaptive revision, and a game that keeps you coming back.
            </p>
            <div className="mt-8 flex gap-3">
              {["🦊", "🦉", "🐼", "🐉"].map((e) => (
                <span key={e} className="grid h-11 w-11 place-items-center rounded-full border border-border bg-surface-2 text-xl">{e}</span>
              ))}
            </div>
          </div>
          <p className="text-xs text-faint">© Synapse — learning, reimagined.</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center px-4 py-10">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="lg:hidden mb-8"><Logo /></div>
          <h1 className="font-display text-2xl font-bold text-ink">
            {isRegister ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {isRegister ? "Start learning in under a minute." : "Log in to keep your streak alive."}
          </p>

          <div className="mt-6 space-y-3">
            {isRegister && (
              <div>
                <label className="label">Name</label>
                <input className="input mt-1" placeholder="Alex Rivera" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input className="input mt-1" type="email" placeholder="you@example.com" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input mt-1" type="password" placeholder="••••••••" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-xl border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">
              {error}
            </div>
          )}

          <button className="btn-primary mt-5 w-full py-3" disabled={loading}>
            {loading ? "Please wait…" : isRegister ? "Create account" : "Log in"}
            {!loading && <Icon.Arrow className="h-4 w-4" />}
          </button>

          <p className="mt-5 text-center text-sm text-muted">
            {isRegister ? "Already have an account? " : "New to Synapse? "}
            <Link href={isRegister ? "/login" : "/register"} className="font-medium text-iris hover:underline">
              {isRegister ? "Log in" : "Create one"}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
