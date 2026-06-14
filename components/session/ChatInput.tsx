"use client";

import { useRef, useEffect, useCallback, KeyboardEvent } from "react";
import type { Subject } from "@/types";
import { useSTT } from "@/hooks/useSTT";

interface ChatInputProps {
  subject: Subject;
  disabled: boolean;
  onSend: (text: string) => void;
  onActivity?: () => void;
}

export default function ChatInput({ subject, disabled, onSend, onActivity }: ChatInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const color = subject === "math" ? "var(--math)" : "var(--ela)";

  const handleTranscript = useCallback((text: string) => {
    onActivity?.();
    if (!ref.current) return;
    ref.current.value = ref.current.value ? ref.current.value + " " + text : text;
    ref.current.style.height = "auto";
    ref.current.style.height = Math.min(ref.current.scrollHeight, 120) + "px";
    ref.current.focus();
  }, [onActivity]);

  const { status: sttStatus, toggle: toggleMic } = useSTT(handleTranscript);
  const isListening = sttStatus === "listening";
  const micSupported = sttStatus !== "unsupported";

  useEffect(() => {
    if (!disabled && ref.current) ref.current.focus();
  }, [disabled]);

  function autoResize() {
    onActivity?.();
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = Math.min(ref.current.scrollHeight, 120) + "px";
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    onActivity?.();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const text = ref.current?.value.trim();
    if (!text || disabled) return;
    onActivity?.();
    onSend(text);
    if (ref.current) {
      ref.current.value = "";
      ref.current.style.height = "auto";
    }
  }

  return (
    <div className="px-4 pb-4">
      <div
        className="flex gap-2 items-end rounded-xl bg-[var(--s2)] border border-[var(--border)] p-2 focus-within:border-opacity-60 transition-colors"
        style={{ ["--focus-color" as string]: color }}
      >
        <textarea
          ref={ref}
          rows={1}
          placeholder={isListening ? "Listening…" : "Ask anything…"}
          disabled={disabled}
          onFocus={onActivity}
          onInput={autoResize}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--muted)] resize-none focus:outline-none py-1 px-1 leading-relaxed"
          style={{ minHeight: "32px", maxHeight: "120px" }}
        />

        {micSupported && (
          <button
            type="button"
            onClick={() => {
              onActivity?.();
              toggleMic();
            }}
            disabled={disabled}
            title={isListening ? "Stop recording" : "Voice input"}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{
              background: isListening ? "#ef4444" : "var(--s3)",
              boxShadow: isListening ? "0 0 0 3px rgba(239,68,68,0.25)" : undefined,
            }}
          >
            {isListening ? (
              /* stop / waveform icon */
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="2" y="5" width="2" height="4" rx="1" fill="white" />
                <rect x="6" y="2" width="2" height="10" rx="1" fill="white" />
                <rect x="10" y="4" width="2" height="6" rx="1" fill="white" />
              </svg>
            ) : (
              /* microphone icon */
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="5" y="1" width="4" height="7" rx="2" fill="var(--muted)" />
                <path
                  d="M2.5 7C2.5 9.485 4.515 11.5 7 11.5C9.485 11.5 11.5 9.485 11.5 7"
                  stroke="var(--muted)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line x1="7" y1="11.5" x2="7" y2="13" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </button>
        )}

        <button
          onClick={submit}
          disabled={disabled}
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          style={{ background: color }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M1 13L7 1L13 13L7 10L1 13Z"
              fill="var(--bg)"
              stroke="var(--bg)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <p className="text-[10px] text-[var(--muted)] mt-1 px-1">
        {isListening ? "Speaking… click mic to stop" : "Enter to send · Shift+Enter for new line"}
      </p>
    </div>
  );
}
