"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";

interface DayPlan {
  day: string; type: string; subject: string;
  topicId: string; topicLabel: string; count: number; note: string;
  completed?: boolean; completedAt?: string | null;
}

const TYPE_ICON: Record<string, string> = {
  practice: "📝", review: "🔁", mixed: "⚡", "mistake-review": "📖",
};

const TYPE_LABEL: Record<string, string> = {
  practice: "Practice", review: "Review", mixed: "Mini-Test", "mistake-review": "Mistake Review",
};

export default function StudyPlanPage() {
  const [days, setDays] = useState<DayPlan[]>([]);
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingDay, setSavingDay] = useState<string | null>(null);

  async function loadPlan() {
    setLoading(true);
    const res = await fetch("/api/study-plan");
    const data = await res.json();
    if (data.plan) {
      setDays(data.plan.days);
      setWeekStart(data.plan.weekStart);
      setUpdatedAt(data.plan.updatedAt);
    }
    setLoading(false);
  }

  async function generatePlan() {
    setGenerating(true);
    const res = await fetch("/api/study-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt.trim() || undefined }),
    });
    const data = await res.json();
    if (data.plan) {
      setDays(data.plan.days);
      setWeekStart(data.plan.weekStart);
      setUpdatedAt(data.plan.updatedAt);
    }
    setGenerating(false);
  }

  async function toggleDay(dayName: string, completed: boolean) {
    setSavingDay(dayName);
    const previous = days;
    setDays((current) => current.map((day) => (
      day.day === dayName
        ? { ...day, completed, completedAt: completed ? new Date().toISOString() : null }
        : day
    )));

    const res = await fetch("/api/study-plan", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day: dayName, completed }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.plan) {
      setDays(data.plan.days);
      setUpdatedAt(data.plan.updatedAt);
    } else {
      setDays(previous);
    }
    setSavingDay(null);
  }

  useEffect(() => { loadPlan(); }, []);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const completedCount = days.filter((day) => day.completed).length;
  const progressPct = days.length ? Math.round((completedCount / days.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <nav className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
        <span className="font-serif italic text-xl text-[var(--text)]">myezsat</span>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">Dashboard</Link>
          <Link href="/practice"  className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">Practice</Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text)]">Study Plan</h1>
            <p className="text-sm text-[var(--muted)] mt-1">
              {weekStart ? `Week of ${new Date(weekStart).toLocaleDateString("en-US", { month: "long", day: "numeric" })}` : "Your personalized weekly plan"}
            </p>
            {updatedAt && (
              <p className="text-[11px] text-[var(--muted)] mt-0.5">
                Saved {new Date(updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} at{" "}
                {new Date(updatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </p>
            )}
          </div>
          <Button variant="math" size="sm" loading={generating} onClick={generatePlan}>
            {days.length ? "Regenerate" : "Generate Plan"}
          </Button>
        </div>

        <div className="card p-4 flex flex-col gap-3">
          <label htmlFor="plan-prompt" className="text-xs uppercase tracking-widest text-[var(--muted)] font-semibold">
            What do you want this plan to focus on?
          </label>
          <textarea
            id="plan-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Example: I want more hard math, especially algebra and geometry. Keep weekends lighter."
            className="w-full bg-[var(--s2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none resize-none"
          />
          <p className="text-[11px] text-[var(--muted)]">
            Include subjects, topics, difficulty, schedule, or anything you want the plan to prioritize.
          </p>
        </div>

        {days.length > 0 && (
          <section className="card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">Weekly progress</p>
                <p className="text-xs text-[var(--muted)]">{completedCount} of {days.length} study days complete</p>
              </div>
              <span className="font-mono text-lg font-semibold text-[var(--math)]">{progressPct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--s3)]">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progressPct}%`, background: "var(--math)" }} />
            </div>
          </section>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-[var(--border)] border-t-[var(--math)] rounded-full animate-spin" />
          </div>
        ) : days.length === 0 ? (
          <div className="card p-8 text-center flex flex-col items-center gap-4">
            <span className="text-4xl">📅</span>
            <div>
              <p className="font-medium text-[var(--text)]">No plan yet</p>
              <p className="text-sm text-[var(--muted)] mt-1">
                Tell us what you want, then generate a plan. It still prioritizes your weakest topics automatically.
              </p>
            </div>
            <Button variant="math" onClick={generatePlan} loading={generating}>Generate My Plan</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {days.map((day) => {
              const isToday = day.day === today;
              const color = day.subject === "math" ? "var(--math)" : "var(--ela)";
              return (
                <div key={day.day}
                  className={`card p-4 flex items-start gap-4 transition-all ${isToday ? "border-2" : ""}`}
                  style={isToday ? { borderColor: color } : {}}>
                  <div className="flex-shrink-0 text-center w-14">
                    <p className={`text-xs font-semibold uppercase tracking-wide ${isToday ? "" : "text-[var(--muted)]"}`}
                      style={isToday ? { color } : {}}>
                      {day.day.slice(0, 3)}
                    </p>
                    <p className="text-2xl mt-0.5">{TYPE_ICON[day.type] ?? "📝"}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[var(--text)]">{day.topicLabel}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium border"
                        style={{ borderColor: color, color }}>{TYPE_LABEL[day.type]}</span>
                      {isToday && <span className="text-[10px] text-green-400 font-semibold">← Today</span>}
                      {day.completed && <span className="text-[10px] text-green-400 font-semibold">Done</span>}
                    </div>
                    <p className="text-xs text-[var(--muted)] mt-0.5">{day.note}</p>
                    {day.count > 0 && (
                      <p className="text-xs text-[var(--muted)] mt-0.5">{day.count} questions · ~{Math.round(day.count * 1.5)} min</p>
                    )}
                    {day.completedAt && (
                      <p className="text-[10px] text-[var(--muted)] mt-1">
                        Completed {new Date(day.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-2">
                    <button
                      type="button"
                      onClick={() => toggleDay(day.day, !day.completed)}
                      disabled={savingDay === day.day}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 ${
                        day.completed
                          ? "border-green-500/50 text-green-400 hover:bg-green-500/10"
                          : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--s2)] hover:text-[var(--text)]"
                      }`}
                    >
                      {day.completed ? "Completed" : "Mark done"}
                    </button>
                    {day.topicId !== "all" && (
                      <Link href={`/practice?topic=${day.topicId}&subject=${day.subject}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--bg)] transition-all"
                        style={{ background: color }}>
                        Start →
                      </Link>
                    )}
                    {day.type === "mistake-review" && (
                      <Link href="/mistakes"
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--bg)] transition-all"
                        style={{ background: color }}>
                        Review →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-[var(--muted)] text-center">
          Your plan and completion progress are saved. Regenerate anytime to adapt it to your latest performance.
        </p>
      </main>
    </div>
  );
}
