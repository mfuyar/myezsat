"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/hooks/useSession";
import { useChat } from "@/hooks/useChat";
import { useTTS } from "@/hooks/useTTS";
import SessionTimer from "./SessionTimer";
import ChatWindow from "./ChatWindow";
import QuickActions from "./QuickActions";
import ChatInput from "./ChatInput";
import TTSButton from "./TTSButton";
import Calculator from "./Calculator";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { formatXP } from "@/lib/utils";
import type { StudySession } from "@/types";

const INACTIVITY_MS = 3 * 60 * 1000;
const FAST_SPEECH_DELAY_MS = 0;
const FAST_SPEECH_MIN_CHARS = 12;

interface ChatSessionProps {
  session: StudySession;
}

interface SummaryState {
  open: boolean;
  xp: number;
  correct: number;
  total: number;
  duration: number;
  streak: number;
  streakEarned: boolean;
}

export default function ChatSession({ session }: ChatSessionProps) {
  const router = useRouter();
  const [summary, setSummary] = useState<SummaryState | null>(null);
  const [calcOpen, setCalcOpen] = useState(false);
  const tts = useTTS();

  // Stable ref so endSession callback doesn't stale-close over session state
  const sessionRef = useRef<ReturnType<typeof useSession> | null>(null);

  const endSession = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return;

    await s.saveDuration();

    const res = await fetch(`/api/session/${session.id}/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        durationSec: s.elapsed,
        xpEarned: s.xp,
        correct: s.correct,
        total: s.total,
      }),
    });

    const data = await res.json();
    setSummary({
      open: true,
      xp: s.xp,
      correct: s.correct,
      total: s.total,
      duration: s.elapsed,
      streak: data.streak ?? 0,
      streakEarned: data.streakEarned ?? false,
    });
  }, [session.id]);

  const sessionHook = useSession({ sessionId: session.id, onEnd: endSession });
  sessionRef.current = sessionHook;

  const autoPausedRef = useRef(false);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = null;
  }, []);

  const resetInactivityTimer = useCallback(() => {
    clearInactivityTimer();
    if (summary?.open) return;

    inactivityTimerRef.current = setTimeout(() => {
      if (sessionRef.current?.paused) return;
      autoPausedRef.current = true;
      sessionRef.current?.pause();
    }, INACTIVITY_MS);
  }, [clearInactivityTimer, summary?.open]);

  const markActivity = useCallback(() => {
    if (autoPausedRef.current) {
      autoPausedRef.current = false;
      sessionRef.current?.resume();
    }
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const chatHook = useChat({
    sessionId: session.id,
    subject: session.subject,
    topicLabel: session.topicLabel,
    difficulty: session.difficulty,
    onScoreUpdate: sessionHook.addScore,
  });

  useEffect(() => {
    resetInactivityTimer();
    return clearInactivityTimer;
  }, [resetInactivityTimer, clearInactivityTimer]);

  const handleTimerToggle = useCallback(() => {
    autoPausedRef.current = false;
    if (sessionHook.paused) {
      sessionHook.resume();
      resetInactivityTimer();
    } else {
      clearInactivityTimer();
      sessionHook.pause();
    }
  }, [clearInactivityTimer, resetInactivityTimer, sessionHook]);

  const sendWithVoiceWarmup = useCallback((text: string) => {
    markActivity();
    chatHook.send(text);
  }, [chatHook, markActivity]);

  // Auto-speak AI responses when teacher voice is enabled
  const messagesRef = useRef(chatHook.messages);
  messagesRef.current = chatHook.messages;
  const prevStreamingRef = useRef(false);
  const spokenMessageRef = useRef<number | null>(null);
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const lastIndex = messagesRef.current.length - 1;
    const last = messagesRef.current[lastIndex];

    if (!tts.enabled) {
      spokenMessageRef.current = null;
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
      prevStreamingRef.current = chatHook.streaming;
      return;
    }

    if (
      chatHook.streaming &&
      last?.role === "assistant" &&
      (last.content.length >= FAST_SPEECH_MIN_CHARS || /[.!?]\s$/.test(last.content)) &&
      spokenMessageRef.current !== lastIndex &&
      !speechTimerRef.current
    ) {
      speechTimerRef.current = setTimeout(() => {
        speechTimerRef.current = null;
        const current = messagesRef.current[lastIndex];
        if (current?.role === "assistant" && current.content) {
          spokenMessageRef.current = lastIndex;
          tts.speak(current.content);
        }
      }, FAST_SPEECH_DELAY_MS);
    }

    if (prevStreamingRef.current && !chatHook.streaming) {
      if (speechTimerRef.current) {
        clearTimeout(speechTimerRef.current);
        speechTimerRef.current = null;
      }

      if (last?.role === "assistant" && last.content) {
        if (spokenMessageRef.current === lastIndex) {
          tts.continueSpeaking(last.content);
        } else {
          spokenMessageRef.current = lastIndex;
          tts.speak(last.content);
        }
      }
    }

    prevStreamingRef.current = chatHook.streaming;
  }, [chatHook.messages, chatHook.streaming, tts.enabled, tts.speak, tts.continueSpeaking]);

  useEffect(() => {
    return () => {
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    };
  }, []);

  const isMath = session.subject === "math";
  const color = isMath ? "var(--math)" : "var(--ela)";
  const diffLabel = session.difficulty.charAt(0).toUpperCase() + session.difficulty.slice(1);

  return (
    <div className="flex flex-col h-screen bg-[var(--bg)]">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] flex-wrap gap-y-2">
        <Link href="/dashboard" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors mr-1">
          ←
        </Link>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Badge variant={session.subject as "math" | "ela"}>
            {isMath ? "Math" : "ELA"}
          </Badge>
          <span className="text-sm text-[var(--muted)] truncate">{session.topicLabel}</span>
          <Badge variant="muted">{diffLabel}</Badge>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="font-mono text-sm text-[var(--math)] font-semibold">
            +{formatXP(sessionHook.xp)} XP
          </span>
          <TTSButton enabled={tts.enabled} speaking={tts.speaking} onToggle={tts.toggle} />
          {isMath && (
            <button
              onClick={() => setCalcOpen((v) => !v)}
              title="Calculator"
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
                calcOpen
                  ? "bg-[var(--math)] text-[var(--bg)]"
                  : "bg-[var(--s2)] text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              🖩
            </button>
          )}
          <SessionTimer
            timeLeft={sessionHook.timeLeft}
            paused={sessionHook.paused}
            onToggle={handleTimerToggle}
          />
          <Button variant="ghost" size="sm" onClick={endSession}>
            End
          </Button>
        </div>
      </header>

      {/* Chat */}
      <ChatWindow
        messages={chatHook.messages}
        subject={session.subject}
        streaming={chatHook.streaming}
      />

      <Calculator open={calcOpen} onClose={() => setCalcOpen(false)} />

      {/* Quick actions + input */}
      <div className="border-t border-[var(--border)]">
        <QuickActions
          subject={session.subject}
          disabled={chatHook.streaming}
          onAction={sendWithVoiceWarmup}
          onActivity={markActivity}
        />
        <ChatInput
          subject={session.subject}
          disabled={chatHook.streaming}
          onSend={sendWithVoiceWarmup}
          onActivity={markActivity}
        />
      </div>

      {/* Session end modal */}
      {summary?.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-8 max-w-sm w-full flex flex-col gap-5 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto"
              style={{ background: isMath ? "var(--math-bg)" : "var(--ela-bg)", color }}
            >
              ✓
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[var(--text)]">Session Complete</h2>
              <p className="text-sm text-[var(--muted)] mt-1">{session.topicLabel}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="card p-3">
                <p className="text-[10px] text-[var(--muted)] uppercase mb-1">XP</p>
                <p className="font-mono font-semibold text-[var(--math)]">+{summary.xp}</p>
              </div>
              <div className="card p-3">
                <p className="text-[10px] text-[var(--muted)] uppercase mb-1">Accuracy</p>
                <p className="font-mono font-semibold text-[var(--green)]">
                  {summary.total > 0 ? Math.round((summary.correct / summary.total) * 100) : 0}%
                </p>
              </div>
              <div className="card p-3">
              <p className="text-[10px] text-[var(--muted)] uppercase mb-1">Streak</p>
                <p className="font-mono font-semibold text-[var(--text)]">
                  {summary.streakEarned ? "🔥" : "○"} {summary.streak}
                </p>
              </div>
            </div>
            {!summary.streakEarned && (
              <p className="text-xs text-[var(--muted)]">
                Streak credit unlocks only after completing the full 60-minute session.
              </p>
            )}
            <Button
              variant={isMath ? "math" : "ela"}
              size="lg"
              onClick={() => router.push("/dashboard")}
              className="w-full"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
