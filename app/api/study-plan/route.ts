import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const ELA_TOPICS: Record<string, string> = {
  "rhetoric": "Rhetoric & Style",
  "reading-comprehension": "Reading Comprehension",
  "punctuation": "Punctuation",
  "vocabulary": "Vocabulary in Context",
  "grammar": "Grammar & Usage",
};

const MATH_TOPICS: Record<string, string> = {
  "algebra": "Algebra",
  "advanced-math": "Advanced Math",
  "problem-solving": "Problem Solving",
  "geometry": "Geometry & Trig",
  "statistics": "Statistics",
};

function getMonday(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = await prisma.studyPlan.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ plan });
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get weak topics from practice history
  const attempts = await prisma.practiceAttempt.findMany({
    where: { userId: user.id },
    select: { isCorrect: true, satQuestion: { select: { topicId: true, subject: true } } },
  });

  const stats: Record<string, { topicId: string; subject: string; correct: number; total: number }> = {};
  for (const a of attempts) {
    const key = a.satQuestion.topicId;
    if (!stats[key]) stats[key] = { topicId: key, subject: a.satQuestion.subject, correct: 0, total: 0 };
    stats[key].total++;
    if (a.isCorrect) stats[key].correct++;
  }

  const sorted = Object.values(stats)
    .map((s) => ({ ...s, accuracy: s.total > 0 ? s.correct / s.total : 0 }))
    .sort((a, b) => a.accuracy - b.accuracy);

  // Build a balanced 7-day plan
  const allElaTopics = Object.entries(ELA_TOPICS).map(([id, label]) => {
    const s = stats[id];
    return { topicId: id, subject: "ela", label, accuracy: s ? s.correct / s.total : null, attempted: !!s };
  });
  const allMathTopics = Object.entries(MATH_TOPICS).map(([id, label]) => {
    const s = stats[id];
    return { topicId: id, subject: "math", label, accuracy: s ? s.correct / s.total : null, attempted: !!s };
  });

  // Sort: unattempted first, then by accuracy ascending
  const sortFn = (a: typeof allElaTopics[0]) => a.accuracy === null ? -1 : a.accuracy;
  const elaPool = [...allElaTopics].sort((a, b) => sortFn(a) - sortFn(b));
  const mathPool = [...allMathTopics].sort((a, b) => sortFn(a) - sortFn(b));

  const days: { day: string; type: string; subject: string; topicId: string; topicLabel: string; count: number; note: string }[] = [];

  const templates = [
    { type: "practice",     subject: "ela",  pool: elaPool,  count: 10, note: "Focus on accuracy" },
    { type: "practice",     subject: "math", pool: mathPool, count: 10, note: "Work through each step" },
    { type: "review",       subject: "ela",  pool: elaPool,  count: 5,  note: "Re-attempt mistakes" },
    { type: "practice",     subject: "ela",  pool: elaPool,  count: 10, note: "Push to medium difficulty" },
    { type: "practice",     subject: "math", pool: mathPool, count: 10, note: "Try harder questions" },
    { type: "mixed",        subject: "ela",  pool: elaPool,  count: 15, note: "Full timed mini-test" },
    { type: "mistake-review", subject: "ela", pool: elaPool, count: 0, note: "Review all mistakes from the week" },
  ];

  for (let i = 0; i < 7; i++) {
    const tmpl = templates[i];
    const topicPool = tmpl.pool.filter((t) => t.subject === tmpl.subject);
    const pick = topicPool[i % topicPool.length] ?? topicPool[0];
    days.push({
      day: DAYS[i],
      type: tmpl.type,
      subject: tmpl.subject,
      topicId: tmpl.type === "mixed" || tmpl.type === "mistake-review" ? "all" : pick.topicId,
      topicLabel: tmpl.type === "mixed" ? "Mixed Practice" : tmpl.type === "mistake-review" ? "Mistake Review" : pick.label,
      count: tmpl.count,
      note: tmpl.note + (pick.accuracy !== null && pick.accuracy < 0.7 ? ` (${Math.round(pick.accuracy * 100)}% accuracy — needs work)` : ""),
    });
  }

  const weekStart = getMonday();
  const plan = await prisma.studyPlan.upsert({
    where: { userId: user.id },
    create: { userId: user.id, weekStart, days },
    update: { weekStart, days },
  });

  return NextResponse.json({ plan });
}
