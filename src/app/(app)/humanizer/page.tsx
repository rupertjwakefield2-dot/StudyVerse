"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { useUser } from "@/components/user-provider";

export default function HumanizerPage() {
  const { me } = useUser();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

  async function humanize() {
    if (!input.trim()) return;
    setLoading(true); setError(""); setOutput(""); setCopied(false);
    try {
      const res = await fetch("/api/humanize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Humanize failed."); return; }
      setOutput(data.humanized);
    } catch { setError("Network error — please try again."); }
    finally { setLoading(false); }
  }

  function copy() {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function swap() {
    setInput(output);
    setOutput("");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">AI Humanizer</h1>
          <p className="mt-1 text-sm text-muted">
            Paste AI-generated text and get a natural, human-sounding rewrite.
            {!me?.isPremium && <span className="ml-1 text-faint">Free users: 3 uses/day. <a href="/premium" className="text-iris hover:underline">Upgrade for unlimited.</a></span>}
          </p>
        </div>
        <span className="chip border-iris/40 text-iris">
          <Icon.Spark className="h-4 w-4" /> Text rewriter
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Input */}
        <div className="card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="label">AI-generated text</label>
            <span className="text-xs text-faint">{wordCount(input)} words</span>
          </div>
          <textarea
            className="input min-h-64 resize-y flex-1"
            placeholder="Paste the AI-generated text you want to humanize…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          {error && (
            <div className="rounded-xl border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">{error}</div>
          )}
          <button
            onClick={humanize}
            disabled={loading || !input.trim()}
            className="btn-primary w-full py-3"
          >
            {loading
              ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Rewriting…</>
              : <><Icon.Spark className="h-4 w-4" /> Humanize text</>
            }
          </button>
        </div>

        {/* Output */}
        <div className="card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="label">Human-sounding result</label>
            {output && <span className="text-xs text-faint">{wordCount(output)} words</span>}
          </div>
          <div
            className={`min-h-64 flex-1 rounded-xl border p-4 text-sm leading-relaxed ${
              output
                ? "border-lime/30 bg-lime/5 text-ink"
                : "border-border bg-surface-2 text-faint italic"
            }`}
          >
            {output || "Your humanized text will appear here…"}
          </div>
          {output && (
            <div className="flex gap-2">
              <button onClick={copy} className="btn-ghost flex-1 py-2 text-sm">
                {copied ? <><Icon.Check className="h-4 w-4 text-lime" /> Copied!</> : <><Icon.Copy className="h-4 w-4" /> Copy</>}
              </button>
              <button onClick={swap} className="btn-ghost flex-1 py-2 text-sm">
                <Icon.Repeat className="h-4 w-4" /> Re-humanize
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="card p-5">
        <h2 className="font-display font-semibold text-ink mb-3">Tips for best results</h2>
        <ul className="grid gap-2 text-sm text-muted sm:grid-cols-2">
          <li className="flex items-start gap-2"><Icon.Check className="h-4 w-4 shrink-0 text-lime mt-0.5" /> Works best on essay-style AI output (GPT, Gemini, etc.)</li>
          <li className="flex items-start gap-2"><Icon.Check className="h-4 w-4 shrink-0 text-lime mt-0.5" /> Replaces overly formal phrases with natural language</li>
          <li className="flex items-start gap-2"><Icon.Check className="h-4 w-4 shrink-0 text-lime mt-0.5" /> Adds contractions and breaks up very long sentences</li>
          <li className="flex items-start gap-2"><Icon.Check className="h-4 w-4 shrink-0 text-lime mt-0.5" /> Always review the output before submitting your work</li>
        </ul>
      </div>
    </div>
  );
}
