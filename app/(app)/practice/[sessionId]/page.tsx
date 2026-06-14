"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface Question {
  id: string;
  subject: string;
  topicId: string;
  difficulty: string;
  hasImage: boolean;
  passage: string | null;
  question: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string | null;
  correctAnswer: string;
}

type AnswerState = { selected: string | null; isCorrect: boolean; correctAnswer: string; explanation: string } | null;

const CHOICE_KEYS = ["A", "B", "C", "D"] as const;
const CHOICE_LABEL: Record<string, string> = { A: "choiceA", B: "choiceB", C: "choiceC", D: "choiceD" };

export default function PracticeSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const questionIds = useMemo(
    () => searchParams.get("q")?.split(",").filter(Boolean) ?? [],
    [searchParams]
  );
  const [index, setIndex] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState<AnswerState>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
  const startTimeRef = useRef(Date.now());

  const fetchQuestion = useCallback(async (id: string) => {
    setLoading(true);
    setAnswer(null);
    startTimeRef.current = Date.now();
    const res = await fetch(`/api/questions/${id}`);
    const data = await res.json();
    setQuestion(data.question);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (questionIds[index]) fetchQuestion(questionIds[index]);
  }, [index, fetchQuestion, questionIds]);

  async function submitAnswer(choice: string) {
    if (answer || submitting || !question) return;
    setSubmitting(true);
    const timeSpentSec = Math.round((Date.now() - startTimeRef.current) / 1000);

    const res = await fetch("/api/practice/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, satQuestionId: question.id, selectedAnswer: choice, timeSpentSec }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (data.isCorrect) setCorrect((c) => c + 1);
    setAnswer({ selected: choice, isCorrect: data.isCorrect, correctAnswer: data.correctAnswer, explanation: data.explanation });
  }

  async function next() {
    if (index + 1 >= questionIds.length) {
      await fetch("/api/practice/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      router.push(`/practice/${sessionId}/results?correct=${correct + (answer?.isCorrect ? 1 : 0)}&total=${questionIds.length}`);
    } else {
      setIndex((i) => i + 1);
    }
  }

  const isMath = question?.subject === "math";
  const color = isMath ? "var(--math)" : "var(--ela)";

  const choiceText = (k: string): string => {
    if (!question) return "";
    return (question as unknown as Record<string, string>)[CHOICE_LABEL[k]] ?? "";
  };

  const choiceStyle = (k: string): string => {
    if (!answer) return "border-[var(--border)] hover:border-opacity-60 hover:bg-[var(--s2)] cursor-pointer";
    if (k === answer.correctAnswer) return "border-green-500 bg-green-500/10";
    if (k === answer.selected && !answer.isCorrect) return "border-red-500 bg-red-500/10";
    return "border-[var(--border)] opacity-50";
  };

  if (finished) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      {/* Top bar */}
      <header className="flex items-center gap-4 px-6 py-3 border-b border-[var(--border)]">
        <Link href="/practice" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">← Exit</Link>
        <div className="flex-1">
          <div className="h-1.5 rounded-full bg-[var(--s3)] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${((index + (answer ? 1 : 0)) / questionIds.length) * 100}%`, background: color }} />
          </div>
        </div>
        <span className="text-xs font-mono text-[var(--muted)]">{index + 1} / {questionIds.length}</span>
        <span className="text-xs font-mono text-green-400">{correct} correct</span>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[var(--border)] border-t-[var(--math)] rounded-full animate-spin" />
          </div>
        ) : question ? (
          <>
            {/* Meta */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={question.subject as "math" | "ela"}>{question.subject === "math" ? "Math" : "R&W"}</Badge>
              <Badge variant="muted">{question.topicId.replace(/-/g, " ")}</Badge>
              <Badge variant="muted">{question.difficulty}</Badge>
              {question.hasImage && <Badge variant="muted">📊 Data</Badge>}
            </div>

            {/* Passage */}
            {question.passage && (
              <div className="card p-4 text-sm text-[var(--text)] leading-relaxed border-l-4 whitespace-pre-wrap max-h-64 overflow-y-auto"
                style={{ borderLeftColor: color }}>
                {question.passage}
              </div>
            )}

            {/* Question */}
            <p className="text-[var(--text)] font-medium leading-relaxed">{question.question}</p>

            {/* Choices */}
            <div className="flex flex-col gap-2">
              {CHOICE_KEYS.filter((k) => choiceText(k)).map((k) => (
                <button key={k} onClick={() => submitAnswer(k)} disabled={!!answer || submitting}
                  className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${choiceStyle(k)}`}>
                  <span className="font-mono text-sm font-bold flex-shrink-0 w-5" style={{ color: answer?.correctAnswer === k ? "#22c55e" : answer?.selected === k && !answer.isCorrect ? "#ef4444" : "var(--muted)" }}>
                    {k}
                  </span>
                  <span className="text-sm text-[var(--text)] leading-relaxed">{choiceText(k)}</span>
                </button>
              ))}
            </div>

            {/* Feedback */}
            {answer && (
              <div className={`card p-4 flex flex-col gap-3 border-l-4 ${answer.isCorrect ? "border-green-500 bg-green-500/5" : "border-red-500 bg-red-500/5"}`}>
                <p className={`text-sm font-semibold ${answer.isCorrect ? "text-green-400" : "text-red-400"}`}>
                  {answer.isCorrect ? "✓ Correct!" : `✗ Incorrect — correct answer is ${answer.correctAnswer}`}
                </p>
                <p className="text-sm text-[var(--text)] leading-relaxed">{answer.explanation}</p>
              </div>
            )}

            {answer && (
              <Button variant={isMath ? "math" : "ela"} onClick={next} className="self-start">
                {index + 1 >= questionIds.length ? "See Results →" : "Next Question →"}
              </Button>
            )}
          </>
        ) : (
          <p className="text-[var(--muted)]">Question not found.</p>
        )}
      </main>
    </div>
  );
}
