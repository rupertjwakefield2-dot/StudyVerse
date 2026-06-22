"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Voice study coach built on the browser's Web Speech API — zero dependencies,
 * no API key. Supports pause / resume / repeat / slow mode and adapts speaking
 * rate. (An ElevenLabs provider can be slotted in behind the same interface.)
 */
export function useVoice() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const lastText = useRef("");
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      // Prefer a natural-sounding English voice.
      voiceRef.current =
        voices.find((v) => /natural|samantha|aria|google us/i.test(v.name) && v.lang.startsWith("en")) ||
        voices.find((v) => v.lang.startsWith("en")) ||
        voices[0] ||
        null;
    };
    pick();
    window.speechSynthesis.onvoiceschanged = pick;
    return () => window.speechSynthesis.cancel();
  }, []);

  const speak = useCallback(
    (text: string, opts?: { rate?: number }) => {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      lastText.current = text;
      const u = new SpeechSynthesisUtterance(text);
      u.rate = opts?.rate ?? rate;
      u.pitch = 1;
      if (voiceRef.current) u.voice = voiceRef.current;
      u.onstart = () => { setSpeaking(true); setPaused(false); };
      u.onend = () => { setSpeaking(false); setPaused(false); };
      u.onerror = () => { setSpeaking(false); setPaused(false); };
      window.speechSynthesis.speak(u);
    },
    [rate]
  );

  const pause = useCallback(() => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  }, []);

  const resume = useCallback(() => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    }
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
  }, []);

  const repeat = useCallback(() => {
    if (lastText.current) speak(lastText.current);
  }, [speak]);

  const slow = useCallback(() => {
    const next = rate <= 0.7 ? 1 : 0.7;
    setRate(next);
    if (lastText.current) speak(lastText.current, { rate: next });
  }, [rate, speak]);

  return { supported, speaking, paused, rate, speak, pause, resume, stop, repeat, slow, setRate };
}
