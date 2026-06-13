"use client";

import { formatDuration } from "@/lib/utils";

interface SessionTimerProps {
  timeLeft: number;
  total?: number;
  paused: boolean;
  onToggle: () => void;
}

export default function SessionTimer({
  timeLeft,
  total = 3600,
  paused,
  onToggle,
}: SessionTimerProps) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const progress = timeLeft / total;
  const strokeDashoffset = circumference * (1 - progress);
  const urgent = timeLeft < 600;
  const color = urgent ? "var(--red)" : "var(--math)";

  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--s2)] border border-[var(--border)] hover:border-[var(--muted)] transition-colors"
      title={paused ? "Resume" : "Pause"}
    >
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={radius} fill="none" stroke="var(--s3)" strokeWidth="2.5" />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="ring-progress transition-all duration-1000"
        />
      </svg>
      <span
        className="font-mono text-sm font-semibold tabular-nums"
        style={{ color }}
      >
        {formatDuration(timeLeft)}
      </span>
      <span className="text-xs text-[var(--muted)]">{paused ? "▶" : "⏸"}</span>
    </button>
  );
}
