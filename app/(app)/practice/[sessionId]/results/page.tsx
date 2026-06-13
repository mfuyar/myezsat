"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";

export default function PracticeResultsPage() {
  const searchParams = useSearchParams();
  const correct = parseInt(searchParams.get("correct") ?? "0");
  const total = parseInt(searchParams.get("total") ?? "0");
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  const grade =
    accuracy >= 90 ? { label: "Excellent!", color: "var(--math)", emoji: "🏆" } :
    accuracy >= 75 ? { label: "Good job!",  color: "var(--ela)",  emoji: "⭐" } :
    accuracy >= 50 ? { label: "Keep going!", color: "#f59e0b",    emoji: "💪" } :
                    { label: "Review needed", color: "#ef4444",   emoji: "📖" };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
      <div className="card p-8 max-w-sm w-full flex flex-col items-center gap-6 text-center">
        <span className="text-5xl">{grade.emoji}</span>

        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">{grade.label}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Practice complete</p>
        </div>

        {/* Score ring */}
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--s3)" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.9" fill="none"
              stroke={grade.color} strokeWidth="3" strokeLinecap="round"
              strokeDasharray={`${accuracy} 100`} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-[var(--text)]">{accuracy}%</span>
            <span className="text-xs text-[var(--muted)]">accuracy</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full">
          <div className="card p-3">
            <p className="text-[10px] text-[var(--muted)] uppercase mb-1">Correct</p>
            <p className="font-mono font-semibold text-green-400">{correct} / {total}</p>
          </div>
          <div className="card p-3">
            <p className="text-[10px] text-[var(--muted)] uppercase mb-1">Accuracy</p>
            <p className="font-mono font-semibold" style={{ color: grade.color }}>{accuracy}%</p>
          </div>
        </div>

        {accuracy < 70 && (
          <p className="text-xs text-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2">
            📖 Below 70% — check your <Link href="/mistakes" className="underline">Mistake Notebook</Link> to review what went wrong.
          </p>
        )}

        <div className="flex flex-col gap-2 w-full">
          <Link href="/practice"><Button variant="math" className="w-full">Practice Again</Button></Link>
          <Link href="/mistakes"><Button variant="ghost" className="w-full">Review Mistakes</Button></Link>
          <Link href="/dashboard"><Button variant="ghost" className="w-full">Dashboard</Button></Link>
        </div>
      </div>
    </div>
  );
}
