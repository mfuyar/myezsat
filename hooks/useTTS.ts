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

function firstSpeechSegment(text: string) {
  const clean = cleanForSpeech(text);
  if (clean.length <= 180) return clean;

  const sentenceEnd = clean.slice(0, 180).search(/[.!?]\s/);
  if (sentenceEnd >= 35) return clean.slice(0, sentenceEnd + 1);

  const commaBreak = clean.slice(0, 160).lastIndexOf(",");
  if (commaBreak >= 60) return clean.slice(0, commaBreak + 1);

  return `${clean.slice(0, 140).trim()}...`;
}

function splitSpeechChunks(text: string) {
  const clean = cleanForSpeech(text).replace(/\s+/g, " ");
  if (!clean) return [];

  const sentences = clean.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [clean];
  const chunks: string[] = [];
  let current = "";

  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;

    if ((current + " " + sentence).trim().length <= 220) {
      current = (current + " " + sentence).trim();
      continue;
    }

    if (current) chunks.push(current);
    if (sentence.length <= 220) {
      current = sentence;
    } else {
      for (let i = 0; i < sentence.length; i += 200) {
        chunks.push(sentence.slice(i, i + 200).trim());
      }
      current = "";
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

export function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // AbortController cancels any in-flight fetch so old requests can't play after stop/toggle
  const abortRef = useRef<AbortController | null>(null);
  const prewarmRef = useRef<Promise<void> | null>(null);
  const queueRef = useRef<string[]>([]);
  const playingRef = useRef(false);
  const spokenPrefixRef = useRef("");

  const stopAll = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    queueRef.current = [];
    playingRef.current = false;
    spokenPrefixRef.current = "";
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

  const playNext = useCallback(async () => {
    if (!enabled || playingRef.current) return;

    const next = queueRef.current.shift();
    if (!next) {
      setSpeaking(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    playingRef.current = true;
    setSpeaking(true);

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: next }),
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
          URL.revokeObjectURL(url);
          audioRef.current = null;
          playingRef.current = false;
          playNext();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          playingRef.current = false;
          playNext();
        };
        await audio.play();
        return;
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
    }

    playingRef.current = false;
    browserFallback(next, controller);
  }, [enabled, browserFallback]);

  const speak = useCallback(
    async (text: string) => {
      if (!enabled) return;

      abortRef.current?.abort();
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();

      const clean = firstSpeechSegment(text);
      if (!clean) return;
      queueRef.current = [clean];
      spokenPrefixRef.current = clean.replace(/\.\.\.$/, "").trim();
      playingRef.current = false;
      playNext();
    },
    [enabled, playNext]
  );

  const continueSpeaking = useCallback((text: string) => {
    if (!enabled) return;

    const clean = cleanForSpeech(text).replace(/\s+/g, " ");
    const prefix = spokenPrefixRef.current;
    const rest = prefix && clean.startsWith(prefix)
      ? clean.slice(prefix.length).trim()
      : clean;
    const chunks = splitSpeechChunks(rest);
    if (!chunks.length) return;

    queueRef.current.push(...chunks);
    playNext();
  }, [enabled, playNext]);

  const prewarm = useCallback(() => {
    if (!enabled || prewarmRef.current) return;

    prewarmRef.current = fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "I am ready to help." }),
    })
      .then(() => undefined)
      .catch(() => undefined)
      .finally(() => {
        prewarmRef.current = null;
      });
  }, [enabled]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      if (prev) {
        // Voice turning OFF — kill everything immediately
        stopAll();
      }
      if (next) {
        window.setTimeout(() => {
          fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: "I am ready to help." }),
          }).catch(() => {});
        }, 0);
      }
      return next;
    });
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  return { speaking, enabled, speak, continueSpeaking, stop: stopAll, toggle, prewarm };
}
