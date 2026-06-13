"use client";

import type { Subject } from "@/types";

interface QuickActionsProps {
  subject: Subject;
  disabled: boolean;
  onAction: (text: string) => void;
}

const MATH_ACTIONS = [
  "Give me a problem",
  "Hint please",
  "Explain differently",
  "Check my work",
];

const ELA_ACTIONS = [
  "Give me a problem",
  "Hint please",
  "Give me a passage",
  "Explain the rule",
];

export default function QuickActions({ subject, disabled, onAction }: QuickActionsProps) {
  const actions = subject === "math" ? MATH_ACTIONS : ELA_ACTIONS;
  const color = subject === "math" ? "var(--math)" : "var(--ela)";

  return (
    <div className="flex gap-2 flex-wrap px-4 py-2 border-t border-[var(--border)]">
      {actions.map((a) => (
        <button
          key={a}
          disabled={disabled}
          onClick={() => onAction(a)}
          className="px-3 py-1.5 rounded-full text-xs font-medium border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:border-opacity-60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{ ["--hover-color" as string]: color }}
        >
          {a}
        </button>
      ))}
    </div>
  );
}
