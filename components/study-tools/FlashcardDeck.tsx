"use client";

import { useCallback, useEffect, useState } from "react";
import type { Subject } from "@/types";

export interface Flashcard {
  id: number;
  front: string;
  back: string;
}

interface FlashcardDeckProps {
  cards: Flashcard[];
  subject: Subject;
  topicLabel: string;
}

export default function FlashcardDeck({ cards, subject, topicLabel }: FlashcardDeckProps) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [done, setDone] = useState(false);
  const [animDir, setAnimDir] = useState<"left" | "right" | null>(null);

  const isMath = subject === "math";
  const color = isMath ? "var(--math)" : "var(--ela)";
  const bgColor = isMath ? "var(--math-bg)" : "var(--ela-bg)";
  const card = cards[index];
  const pct = Math.round(((index + 1) / cards.length) * 100);

  const goNext = useCallback(
    (markAsKnown?: boolean) => {
      if (markAsKnown !== undefined) {
        setKnown((prev) => {
          const s = new Set(prev);
          if (markAsKnown) s.add(card.id);
          else s.delete(card.id);
          return s;
        });
      }
      setAnimDir("left");
      setTimeout(() => {
        if (index < cards.length - 1) {
          setIndex((i) => i + 1);
          setFlipped(false);
        } else {
          setDone(true);
        }
        setAnimDir(null);
      }, 200);
    },
    [card?.id, index, cards.length]
  );

  const goPrev = useCallback(() => {
    if (index === 0) return;
    setAnimDir("right");
    setTimeout(() => {
      setIndex((i) => i - 1);
      setFlipped(false);
      setAnimDir(null);
    }, 200);
  }, [index]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFlipped((f) => !f); }
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (flipped) {
        if (e.key === "1") goNext(false);
        if (e.key === "2") goNext(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipped, goNext, goPrev]);

  function restart() {
    setIndex(0);
    setFlipped(false);
    setKnown(new Set());
    setDone(false);
    setAnimDir(null);
  }

  if (done) {
    const knownCount = known.size;
    const score = Math.round((knownCount / cards.length) * 100);
    const great = score >= 70;
    return (
      <div className="flex flex-col items-center gap-6 py-6">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
          style={{ background: bgColor }}
        >
          {great ? "🏆" : "📚"}
        </div>
        <div className="text-center">
          <h3 className="text-2xl font-bold text-[var(--text)]">{score}%</h3>
          <p className="text-sm text-[var(--muted)] mt-1">
            {knownCount} of {cards.length} cards mastered — {topicLabel}
          </p>
        </div>

        <div className="w-full max-w-sm bg-[var(--border)] rounded-full h-3 overflow-hidden">
          <div
            className="h-3 rounded-full transition-all duration-1000"
            style={{ width: `${score}%`, background: color }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          <div className="rounded-2xl border border-[var(--border)] p-4 text-center" style={{ background: bgColor }}>
            <p className="text-3xl font-bold" style={{ color }}>{knownCount}</p>
            <p className="text-xs text-[var(--muted)] mt-1">Got it</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-center">
            <p className="text-3xl font-bold text-[var(--muted)]">{cards.length - knownCount}</p>
            <p className="text-xs text-[var(--muted)] mt-1">Still learning</p>
          </div>
        </div>

        <button
          onClick={restart}
          className="h-12 px-8 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: color }}
        >
          Study Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Meta row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>
            {topicLabel}
          </p>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Card {index + 1} of {cards.length}
            {known.size > 0 && ` · ${known.size} known`}
          </p>
        </div>
        <span className="text-xs text-[var(--muted)] font-mono">{pct}%</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-[var(--border)] rounded-full h-1.5 overflow-hidden">
        <div
          className="h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>

      {/* Card stack */}
      <div
        className="relative"
        style={{ height: "280px" }}
      >
        {/* Stack layers (cards behind) */}
        {index + 2 < cards.length && (
          <div
            className="absolute inset-x-0 bottom-0 rounded-2xl border border-[var(--border)]"
            style={{
              background: "var(--card)",
              height: "280px",
              transform: "translateY(10px) scale(0.93)",
              zIndex: 0,
            }}
          />
        )}
        {index + 1 < cards.length && (
          <div
            className="absolute inset-x-0 bottom-0 rounded-2xl border border-[var(--border)]"
            style={{
              background: "var(--card)",
              height: "280px",
              transform: "translateY(5px) scale(0.965)",
              zIndex: 1,
            }}
          />
        )}

        {/* Main flip card */}
        <div
          className={`absolute inset-0 cursor-pointer transition-opacity duration-200 ${
            animDir ? "opacity-0" : "opacity-100"
          }`}
          style={{ perspective: "1200px", zIndex: 2 }}
          onClick={() => setFlipped((f) => !f)}
        >
          <div
            className="relative w-full h-full transition-transform duration-500"
            style={{
              transformStyle: "preserve-3d",
              transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 rounded-2xl border border-[var(--border)] flex flex-col items-center justify-center gap-4 p-8"
              style={{ backfaceVisibility: "hidden", background: "var(--card)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
                Question
              </p>
              <p className="text-lg font-medium text-[var(--text)] text-center leading-relaxed max-w-xs">
                {card.front}
              </p>
              <div className="mt-auto flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <span>↻</span>
                <span>tap to reveal</span>
                <span className="ml-2 opacity-40">· space</span>
              </div>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 rounded-2xl flex flex-col gap-4 overflow-hidden"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                background: bgColor,
                border: `1.5px solid`,
                borderColor: color + "50",
              }}
            >
              {/* Colored header strip */}
              <div
                className="px-8 pt-5 pb-3 border-b"
                style={{ borderColor: color + "30" }}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
                  Answer
                </p>
              </div>
              <div className="flex-1 flex items-center justify-center px-8 pb-6">
                <p className="text-base text-[var(--text)] text-center leading-relaxed">
                  {card.back}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {flipped ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => goNext(false)}
            className="h-12 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--s2)] transition-all"
          >
            <span className="text-base">😅</span> Still learning
            <span className="block text-[10px] opacity-50 mt-0.5">press 1</span>
          </button>
          <button
            onClick={() => goNext(true)}
            className="h-12 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: color }}
          >
            <span className="text-base">✓</span> Got it!
            <span className="block text-[10px] opacity-70 mt-0.5">press 2</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={goPrev}
            disabled={index === 0}
            className="h-12 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            ← Previous
          </button>
          <button
            onClick={() => goNext()}
            className="h-12 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] transition-all"
          >
            {index < cards.length - 1 ? "Skip →" : "Finish"}
          </button>
        </div>
      )}

      {/* Keyboard hint */}
      <p className="text-center text-[10px] text-[var(--muted)] opacity-60">
        Space to flip · ← → to navigate
      </p>
    </div>
  );
}
