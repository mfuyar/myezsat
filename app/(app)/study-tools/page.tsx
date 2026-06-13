"use client";

import { useState } from "react";
import Link from "next/link";
import { MATH_TOPICS, ELA_TOPICS } from "@/types";
import type { Subject, Difficulty, Topic } from "@/types";
import FlashcardDeck, { type Flashcard } from "@/components/study-tools/FlashcardDeck";
import Slideshow, { type Slide } from "@/components/study-tools/Slideshow";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";

type ToolView = "flashcards" | "slideshow";
type FlashcardMode = "concept" | "vocabulary";
type MathSection = "all" | "1" | "2";

const DIFFICULTIES: { value: Difficulty; label: string; desc: string }[] = [
  { value: "easy", label: "Easy", desc: "Core concepts" },
  { value: "medium", label: "Medium", desc: "Standard SAT" },
  { value: "hard", label: "Hard", desc: "Advanced" },
];

export default function StudyToolsPage() {
  const [subject, setSubject] = useState<Subject>("math");
  const [mathSection, setMathSection] = useState<MathSection>("all");
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [flashcardMode, setFlashcardMode] = useState<FlashcardMode>("concept");

  const [activeView, setActiveView] = useState<ToolView | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[] | null>(null);
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [loadingType, setLoadingType] = useState<ToolView | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allTopics = subject === "math" ? MATH_TOPICS : ELA_TOPICS;
  const topics =
    subject !== "math" || mathSection === "all"
      ? allTopics
      : allTopics.filter((t) => t.mathSection === mathSection || t.mathSection === "both");
  const isMath = subject === "math";
  const color = isMath ? "var(--math)" : "var(--ela)";
  const bgColor = isMath ? "var(--math-bg)" : "var(--ela-bg)";

  function switchSubject(s: Subject) {
    setSubject(s);
    setMathSection("all");
    setSelectedTopic(null);
    setActiveView(null);
    setFlashcards(null);
    setSlides(null);
    setFromCache(false);
    setError(null);
  }

  async function generate(type: ToolView, regenerate = false) {
    if (!selectedTopic) return;
    setLoadingType(type);
    setError(null);
    setActiveView(null);

    try {
      const res = await fetch(`/api/generate/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          topicLabel: selectedTopic.label,
          difficulty,
          regenerate,
          ...(type === "flashcards" ? { mode: flashcardMode } : {}),
        }),
      });

      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();

      if (type === "flashcards") {
        setFlashcards(data.flashcards);
      } else {
        setSlides(data.slides);
      }
      setFromCache(data.fromCache ?? false);
      setActiveView(type);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingType(null);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Nav */}
      <nav className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
        <span className="font-serif italic text-xl text-[var(--text)]">myezsat</span>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">
            Dashboard
          </Link>
          <Link href="/progress" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">
            Progress
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">Study Tools</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Generate flashcards and slide lessons from any SAT topic
          </p>
        </div>

        {/* Subject tabs */}
        <div className="flex gap-2">
          {(["math", "ela"] as Subject[]).map((s) => (
            <button
              key={s}
              onClick={() => switchSubject(s)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 border ${
                subject === s
                  ? "border-transparent text-[var(--bg)]"
                  : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
              }`}
              style={subject === s ? { background: s === "math" ? "var(--math)" : "var(--ela)" } : {}}
            >
              {s === "math" ? "Math" : "English & Reading"}
            </button>
          ))}
        </div>

        {/* Math module filter */}
        {isMath && (
          <div>
            <p className="text-xs text-[var(--muted)] uppercase tracking-widest font-semibold mb-2">
              SAT Module
            </p>
            <div className="flex gap-2">
              {([
                { value: "all", label: "All topics" },
                { value: "1", label: "Module 1" },
                { value: "2", label: "Module 2" },
              ] as { value: MathSection; label: string }[]).map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    setMathSection(s.value);
                    setSelectedTopic(null);
                    setActiveView(null);
                    setFlashcards(null);
                    setSlides(null);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 border ${
                    mathSection === s.value
                      ? "border-transparent text-[var(--bg)]"
                      : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                  style={mathSection === s.value ? { background: color } : {}}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Difficulty */}
        <div>
          <p className="text-xs text-[var(--muted)] uppercase tracking-widest font-semibold mb-2">
            Difficulty
          </p>
          <div className="flex gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                onClick={() => setDifficulty(d.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 border ${
                  difficulty === d.value
                    ? "border-transparent text-[var(--bg)]"
                    : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
                }`}
                style={difficulty === d.value ? { background: color } : {}}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Topic grid */}
        <div>
          <p className="text-xs text-[var(--muted)] uppercase tracking-widest font-semibold mb-3">
            Topic
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topics.map((topic) => {
              const isSelected = selectedTopic?.id === topic.id;
              return (
                <Card
                  key={topic.id}
                  subject={subject}
                  hover
                  onClick={() => {
                    setSelectedTopic(topic);
                    setActiveView(null);
                    setFlashcards(null);
                    setSlides(null);
                    setError(null);
                  }}
                  className="p-4 flex flex-col gap-2 cursor-pointer"
                  style={
                    isSelected
                      ? { borderColor: color, background: bgColor }
                      : {}
                  }
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{topic.icon}</span>
                    <span className="font-medium text-[var(--text)]">{topic.label}</span>
                    {topic.mathSection && (
                      <span className="text-[10px] text-[var(--muted)] border border-[var(--border)] rounded px-1.5 py-0.5 ml-auto">
                        {topic.mathSection === "both" ? "M1 & M2" : `M${topic.mathSection}`}
                      </span>
                    )}
                    {isSelected && (
                      <span className="text-sm" style={{ color }}>✓</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {topic.subtopics.map((s) => (
                      <Badge key={s} variant="muted" className="text-[10px]">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Generate buttons */}
        {selectedTopic && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-[var(--muted)] uppercase tracking-widest font-semibold">
              Generate for:{" "}
              <span style={{ color }} className="normal-case font-semibold">
                {selectedTopic.label}
              </span>
            </p>

            {/* Vocabulary toggle — only shown for ELA */}
            {subject === "ela" && (
              <div className="flex items-center gap-2">
                <p className="text-xs text-[var(--muted)] mr-1">Flashcard type:</p>
                {(["concept", "vocabulary"] as FlashcardMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setFlashcardMode(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      flashcardMode === m
                        ? "border-transparent text-[var(--bg)]"
                        : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
                    }`}
                    style={flashcardMode === m ? { background: color } : {}}
                  >
                    {m === "concept" ? "Concepts & Rules" : "Vocabulary (word + definition)"}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => generate("flashcards")}
                disabled={loadingType !== null}
                className="h-16 rounded-xl border border-[var(--border)] flex items-center gap-4 px-5 hover:bg-[var(--s2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                <span className="text-2xl">🃏</span>
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">
                    {loadingType === "flashcards" ? "Generating…" : "Flashcards"}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {subject === "ela" && flashcardMode === "vocabulary"
                      ? "12 vocab cards, word + definition"
                      : "10 cards, flip to reveal"}
                  </p>
                </div>
                {loadingType === "flashcards" && (
                  <svg className="ml-auto animate-spin h-4 w-4 text-[var(--muted)]" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
              </button>

              <button
                onClick={() => generate("slideshow")}
                disabled={loadingType !== null}
                className="h-16 rounded-xl border border-[var(--border)] flex items-center gap-4 px-5 hover:bg-[var(--s2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                <span className="text-2xl">📊</span>
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">
                    {loadingType === "slideshow" ? "Generating…" : "Slideshow"}
                  </p>
                  <p className="text-xs text-[var(--muted)]">8-slide mini-lesson</p>
                </div>
                {loadingType === "slideshow" && (
                  <svg className="ml-auto animate-spin h-4 w-4 text-[var(--muted)]" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="card p-4 border-red-500/30 bg-red-500/10">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Results */}
        {activeView === "flashcards" && flashcards && selectedTopic && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-[var(--text)] uppercase tracking-widest">
                  Flashcards — {selectedTopic.label}
                </h2>
                {fromCache && (
                  <span className="text-[10px] text-[var(--muted)] border border-[var(--border)] rounded px-1.5 py-0.5">
                    saved
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={subject}>{difficulty}</Badge>
                <button
                  onClick={() => generate("flashcards", true)}
                  disabled={loadingType !== null}
                  className="text-[11px] text-[var(--muted)] hover:text-[var(--text)] transition-colors disabled:opacity-40"
                >
                  Regenerate
                </button>
              </div>
            </div>
            <div className="card p-6">
              <FlashcardDeck
                cards={flashcards}
                subject={subject}
                topicLabel={selectedTopic.label}
              />
            </div>
          </section>
        )}

        {activeView === "slideshow" && slides && selectedTopic && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-[var(--text)] uppercase tracking-widest">
                  Lesson — {selectedTopic.label}
                </h2>
                {fromCache && (
                  <span className="text-[10px] text-[var(--muted)] border border-[var(--border)] rounded px-1.5 py-0.5">
                    saved
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={subject}>{difficulty}</Badge>
                <button
                  onClick={() => generate("slideshow", true)}
                  disabled={loadingType !== null}
                  className="text-[11px] text-[var(--muted)] hover:text-[var(--text)] transition-colors disabled:opacity-40"
                >
                  Regenerate
                </button>
              </div>
            </div>
            <div className="card p-6">
              <Slideshow
                slides={slides}
                subject={subject}
                topicLabel={selectedTopic.label}
              />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
