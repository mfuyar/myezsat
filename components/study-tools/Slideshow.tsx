"use client";

import { useCallback, useEffect, useState } from "react";
import { useTTS } from "@/hooks/useTTS";
import TTSButton from "@/components/session/TTSButton";
import type { Subject } from "@/types";

export interface Slide {
  id: number;
  title: string;
  content: string;
  example: string;
}

interface SlideshowProps {
  slides: Slide[];
  subject: Subject;
  topicLabel: string;
}

// ─── Decorative SVG shapes for title slides ────────────────────────────────
function DecorCircles({ color }: { color: string }) {
  return (
    <>
      {/* Large circle top-right */}
      <div
        className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: color, opacity: 0.12 }}
      />
      {/* Medium circle bottom-left */}
      <div
        className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full pointer-events-none"
        style={{ background: color, opacity: 0.08 }}
      />
      {/* Small circle mid-right */}
      <div
        className="absolute top-1/2 -right-6 w-20 h-20 rounded-full pointer-events-none"
        style={{ background: color, opacity: 0.15 }}
      />
      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(${color}30 1.5px, transparent 1.5px)`,
          backgroundSize: "28px 28px",
        }}
      />
    </>
  );
}

// ─── Title / Outro slide ───────────────────────────────────────────────────
function TitleSlide({
  slide, index, total, subject, topicLabel, color, bgColor,
}: {
  slide: Slide; index: number; total: number;
  subject: Subject; topicLabel: string;
  color: string; bgColor: string;
}) {
  const isOutro = index === total - 1;
  return (
    <div
      className="relative overflow-hidden rounded-2xl flex flex-col justify-between"
      style={{ minHeight: "360px", background: bgColor }}
    >
      <DecorCircles color={color} />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-8 pt-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color }}>
            {subject === "math" ? "Math" : "ELA"} · {topicLabel}
          </span>
        </div>
        <span
          className="text-xs font-bold px-3 py-1 rounded-full"
          style={{ background: color + "25", color }}
        >
          {index + 1} / {total}
        </span>
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-5 px-10 py-8 text-center flex-1">
        {isOutro && (
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-1"
            style={{ background: color + "25" }}
          >
            ★
          </div>
        )}
        <h2
          className="font-bold text-[var(--text)] leading-tight"
          style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)" }}
        >
          {slide.title}
        </h2>
        <p
          className="text-[var(--text)] leading-relaxed max-w-md"
          style={{ opacity: 0.75, fontSize: "0.95rem" }}
        >
          {slide.content}
        </p>
        {slide.example && (
          <div
            className="rounded-xl px-5 py-3 text-sm font-mono text-center"
            style={{ background: color + "18", color, border: `1px solid ${color}30` }}
          >
            {slide.example}
          </div>
        )}
      </div>

      {/* Bottom accent bar */}
      <div className="relative z-10 h-1 w-full" style={{ background: color + "40" }} />
    </div>
  );
}

// ─── Content slide ─────────────────────────────────────────────────────────
function ContentSlide({
  slide, index, total, color, bgColor,
}: {
  slide: Slide; index: number; total: number; color: string; bgColor: string;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: `1.5px solid ${color}22` }}
    >
      {/* Slide header band */}
      <div
        className="relative px-7 pt-5 pb-5 flex items-start gap-4"
        style={{
          background: `linear-gradient(105deg, ${bgColor} 0%, ${bgColor}60 100%)`,
          borderBottom: `1px solid ${color}20`,
        }}
      >
        {/* Left accent bar */}
        <div className="w-1 flex-shrink-0 self-stretch rounded-full mt-0.5" style={{ background: color }} />
        <h2 className="text-lg font-bold text-[var(--text)] leading-snug flex-1">
          {slide.title}
        </h2>
        <span
          className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full self-start"
          style={{ background: color + "22", color }}
        >
          {index + 1} / {total}
        </span>
      </div>

      {/* Body */}
      <div className="px-7 pt-5 pb-6 flex flex-col gap-5" style={{ background: "var(--card)" }}>
        <p className="text-sm text-[var(--text)] leading-[1.85] whitespace-pre-line">
          {slide.content}
        </p>

        {slide.example && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: `1px solid ${color}25` }}
          >
            {/* Example label bar */}
            <div
              className="px-4 py-2 flex items-center gap-2"
              style={{ background: color + "18" }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 6h10M6 1v10" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
                Example
              </span>
            </div>
            <div
              className="px-4 py-3"
              style={{ background: bgColor + "70" }}
            >
              <p className="text-sm font-mono text-[var(--text)] leading-relaxed whitespace-pre-line">
                {slide.example}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom progress bar */}
      <div className="h-[3px] w-full" style={{ background: "var(--border)" }}>
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${((index + 1) / total) * 100}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ─── Main Slideshow ─────────────────────────────────────────────────────────
export default function Slideshow({ slides, subject, topicLabel }: SlideshowProps) {
  const [index, setIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const tts = useTTS();

  const isMath = subject === "math";
  const color = isMath ? "var(--math)" : "var(--ela)";
  const bgColor = isMath ? "var(--math-bg)" : "var(--ela-bg)";
  const slide = slides[index];
  const isSpecial = index === 0 || index === slides.length - 1;

  const speakSlide = useCallback(
    (s: Slide) => {
      const text = [s.title, s.content, s.example ? `Example: ${s.example}` : ""]
        .filter(Boolean)
        .join(". ");
      tts.speak(text);
    },
    [tts]
  );

  const jumpTo = useCallback(
    (i: number) => {
      if (animating || i === index || i < 0 || i >= slides.length) return;
      tts.stop();
      setAnimating(true);
      setTimeout(() => { setIndex(i); setAnimating(false); }, 200);
    },
    [animating, index, slides.length, tts]
  );

  const go = useCallback((dir: 1 | -1) => jumpTo(index + dir), [index, jumpTo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") go(1);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // Auto-speak when voice is enabled and slide changes
  useEffect(() => {
    if (tts.enabled) speakSlide(slide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, tts.enabled]);

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>
            {topicLabel}
          </span>
          <span className="text-xs text-[var(--muted)]">· {slides.length} slides</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => speakSlide(slide)}
            disabled={!tts.enabled}
            className="h-8 px-3 rounded-lg border border-[var(--border)] text-xs text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
          >
            <span>▶</span> Read slide
          </button>
          <TTSButton enabled={tts.enabled} speaking={tts.speaking} onToggle={tts.toggle} />
        </div>
      </div>

      {/* Slide */}
      <div
        className={`transition-opacity duration-200 ${animating ? "opacity-0 scale-[0.99]" : "opacity-100 scale-100"}`}
        style={{ transition: "opacity 0.2s, transform 0.2s" }}
      >
        {isSpecial ? (
          <TitleSlide
            slide={slide}
            index={index}
            total={slides.length}
            subject={subject}
            topicLabel={topicLabel}
            color={color}
            bgColor={bgColor}
          />
        ) : (
          <ContentSlide
            slide={slide}
            index={index}
            total={slides.length}
            color={color}
            bgColor={bgColor}
          />
        )}
      </div>

      {/* Navigation row */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => go(-1)}
          disabled={index === 0 || animating}
          className="h-11 w-24 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
        >
          ← Prev
        </button>

        {/* Dot pills */}
        <div className="flex-1 flex items-center justify-center gap-1.5 flex-wrap">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => jumpTo(i)}
              title={`Slide ${i + 1}`}
              className="rounded-full transition-all duration-250"
              style={{
                height: "8px",
                width: i === index ? "24px" : "8px",
                background: i === index ? color : "var(--border)",
                opacity: i === index ? 1 : 0.5,
              }}
            />
          ))}
        </div>

        <button
          onClick={() => go(1)}
          disabled={index === slides.length - 1 || animating}
          className="h-11 w-24 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          style={{ background: color }}
        >
          Next →
        </button>
      </div>

      <p className="text-center text-[10px] text-[var(--muted)] opacity-50">
        ← → arrow keys to navigate
      </p>
    </div>
  );
}
