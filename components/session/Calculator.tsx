"use client";

import { useState } from "react";

interface CalculatorProps {
  open: boolean;
  onClose: () => void;
}

export default function Calculator({ open, onClose }: CalculatorProps) {
  const [mode, setMode] = useState<"scientific" | "graphing">("scientific");

  if (!open) return null;

  const src =
    mode === "scientific"
      ? "https://www.desmos.com/scientific"
      : "https://www.desmos.com/calculator";

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex flex-col w-[360px] max-w-[92vw] bg-[var(--bg)] border-l border-[var(--border)] shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[var(--text)]">Calculator</span>
          <div className="flex rounded-lg overflow-hidden border border-[var(--border)]">
            <button
              onClick={() => setMode("scientific")}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                mode === "scientific"
                  ? "bg-[var(--math)] text-[var(--bg)]"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              Scientific
            </button>
            <button
              onClick={() => setMode("graphing")}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                mode === "graphing"
                  ? "bg-[var(--math)] text-[var(--bg)]"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              Graphing
            </button>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--s2)] transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Desmos embed */}
      <iframe
        key={mode}
        src={src}
        className="flex-1 w-full border-none"
        title="Calculator"
        allow="fullscreen"
      />
    </div>
  );
}
