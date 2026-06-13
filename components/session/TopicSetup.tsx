"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MATH_TOPICS, ELA_TOPICS } from "@/types";
import type { Subject, Difficulty, Topic } from "@/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

interface TopicSetupProps {
  subject: Subject;
}

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

type MathSection = "all" | "1" | "2";

export default function TopicSetup({ subject }: TopicSetupProps) {
  const router = useRouter();
  const allTopics = subject === "math" ? MATH_TOPICS : ELA_TOPICS;
  const [mathSection, setMathSection] = useState<MathSection>("all");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(false);
  const color = subject === "math" ? "var(--math)" : "var(--ela)";

  const topics =
    subject !== "math" || mathSection === "all"
      ? allTopics
      : allTopics.filter((t) => t.mathSection === mathSection || t.mathSection === "both");

  async function handleStart() {
    if (!selectedTopic) return;
    setLoading(true);

    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        topicId: selectedTopic.id,
        topicLabel: selectedTopic.label,
        difficulty,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Session create failed:", res.status, text);
      setLoading(false);
      return;
    }

    const data = await res.json();
    if (data.session) {
      router.push(`/session/${data.session.id}`);
    } else {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold"
          style={{ background: subject === "math" ? "var(--math-bg)" : "var(--ela-bg)", color }}
        >
          {subject === "math" ? "Σ" : "A"}
        </div>
        <div>
          <p className="text-xs text-[var(--muted)] uppercase tracking-wide">
            {subject === "math" ? "Math" : "English & Reading"}
          </p>
          <h1 className="text-xl font-semibold text-[var(--text)]">Choose your focus</h1>
        </div>
      </div>

      {/* Math section filter */}
      {subject === "math" && (
        <div>
          <p className="text-xs text-[var(--muted)] uppercase tracking-wide mb-2 font-medium">
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
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 border ${
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

      {/* Difficulty selector */}
      <div>
        <p className="text-xs text-[var(--muted)] uppercase tracking-wide mb-2 font-medium">
          Difficulty
        </p>
        <div className="flex gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              onClick={() => setDifficulty(d.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 border ${
                difficulty === d.value
                  ? "border-transparent text-[var(--bg)]"
                  : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
              }`}
              style={
                difficulty === d.value ? { background: color } : {}
              }
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Topic grid */}
      <div>
        <p className="text-xs text-[var(--muted)] uppercase tracking-wide mb-2 font-medium">
          Topic
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {topics.map((topic) => (
            <Card
              key={topic.id}
              subject={subject}
              hover
              onClick={() => setSelectedTopic(topic)}
              className={`p-4 flex flex-col gap-2 cursor-pointer transition-all duration-150 ${
                selectedTopic?.id === topic.id ? "border-opacity-100" : ""
              }`}
              style={
                selectedTopic?.id === topic.id
                  ? { borderColor: color, background: subject === "math" ? "var(--math-bg)" : "var(--ela-bg)" }
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
                {selectedTopic?.id === topic.id && (
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
          ))}
        </div>
      </div>

      <Button
        variant={subject === "math" ? "math" : "ela"}
        size="lg"
        onClick={handleStart}
        loading={loading}
        disabled={!selectedTopic}
        className="w-full sm:w-auto self-start"
      >
        Start Session →
      </Button>
    </div>
  );
}
