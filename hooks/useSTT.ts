"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Web Speech API types not included in standard TS DOM lib
interface ISpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: any) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type STTStatus = "idle" | "listening" | "unsupported";

export function useSTT(onTranscript: (text: string) => void) {
  const [status, setStatus] = useState<STTStatus>("idle");
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  useEffect(() => {
    const SR =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SR) setStatus("unsupported");
  }, []);

  const start = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition: ISpeechRecognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript as string;
      if (transcript.trim()) onTranscript(transcript.trim());
    };

    recognition.onend = () => setStatus("idle");
    recognition.onerror = () => setStatus("idle");

    recognition.start();
    setStatus("listening");
  }, [onTranscript]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setStatus("idle");
  }, []);

  const toggle = useCallback(() => {
    if (status === "listening") stop();
    else start();
  }, [status, start, stop]);

  useEffect(() => () => { recognitionRef.current?.abort(); }, []);

  return { status, toggle };
}
