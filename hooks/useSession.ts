"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const SESSION_DURATION = 3600;

interface UseSessionOptions {
  sessionId: string;
  onEnd: () => void;
}

export function useSession({ sessionId, onEnd }: UseSessionOptions) {
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION);
  const [paused, setPaused] = useState(false);
  const [xp, setXp] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const xpRef = useRef(0);
  const correctRef = useRef(0);
  const totalRef = useRef(0);
  const elapsedRef = useRef(0);
  const saveInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  const saveDuration = useCallback(async () => {
    await fetch(`/api/session/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        durationSec: elapsedRef.current,
        xpEarned: xpRef.current,
        correct: correctRef.current,
        total: totalRef.current,
      }),
    });
  }, [sessionId]);

  useEffect(() => {
    timerInterval.current = setInterval(() => {
      setPaused((isPaused) => {
        if (!isPaused) {
          elapsedRef.current += 1;
          setElapsed(elapsedRef.current);
          setTimeLeft((t) => {
            if (t <= 1) {
              clearInterval(timerInterval.current!);
              onEndRef.current();
              return 0;
            }
            return t - 1;
          });
        }
        return isPaused;
      });
    }, 1000);

    return () => clearInterval(timerInterval.current!);
  }, []);

  useEffect(() => {
    saveInterval.current = setInterval(saveDuration, 30_000);
    return () => clearInterval(saveInterval.current!);
  }, [saveDuration]);

  const togglePause = useCallback(() => setPaused((p) => !p), []);
  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);

  const addScore = useCallback((isCorrect: boolean, earnedXP: number) => {
    setTotal((t) => {
      totalRef.current = t + 1;
      return t + 1;
    });
    if (isCorrect) {
      setCorrect((c) => {
        correctRef.current = c + 1;
        return c + 1;
      });
    }
    setXp((x) => {
      xpRef.current = x + earnedXP;
      return x + earnedXP;
    });
  }, []);

  return {
    timeLeft,
    paused,
    togglePause,
    pause,
    resume,
    xp,
    correct,
    total,
    elapsed,
    addScore,
    saveDuration,
  };
}
