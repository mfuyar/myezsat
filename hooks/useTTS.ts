"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function cleanForSpeech(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`{1,3}[\s\S]*?`{1,3}/g, "")
    .replace(/#{1,6}\s/g, "")
    .replace(/✓\s*ANSWER:/gi, "Correct answer:")
    .replace(/\[(EASY|MEDIUM|HARD)\]/gi, "")
    .replace(/Step\s+(\d+):/g, "Step $1.")
    .trim();
}

export function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // AbortController cancels any in-flight fetch so old requests can't play after stop/toggle
  const abortRef = useRef<AbortController | null>(null);

  const stopAll = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const browserFallback = useCallback((text: string, controller: AbortController) => {
    if (controller.signal.aborted) return;
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => v.lang.startsWith("en") && v.name.includes("Samantha")) ||
      voices.find((v) => v.lang.startsWith("en")) ||
      voices[0];
    if (preferred) utterance.voice = preferred;
    utterance.rate = 0.88;
    utterance.pitch = 1.05;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!enabled) return;

      // Cancel any previous request + speech before starting a new one
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();

      const clean = cleanForSpeech(text);
      if (!clean) return;
      setSpeaking(true);

      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: clean }),
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (res.ok) {
          const blob = await res.blob();
          if (controller.signal.aborted) return;

          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => {
            setSpeaking(false);
            URL.revokeObjectURL(url);
            audioRef.current = null;
          };
          audio.onerror = () => {
            setSpeaking(false);
            URL.revokeObjectURL(url);
            audioRef.current = null;
          };
          await audio.play();
          return;
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }

      browserFallback(clean, controller);
    },
    [enabled, browserFallback]
  );

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      if (prev) {
        // Voice turning OFF — kill everything immediately
        abortRef.current?.abort();
        abortRef.current = null;
        audioRef.current?.pause();
        audioRef.current = null;
        if (typeof window !== "undefined") window.speechSynthesis?.cancel();
        setSpeaking(false);
      }
      return !prev;
    });
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  return { speaking, enabled, speak, stop: stopAll, toggle };
}
