import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api/auth";
import { z } from "zod";

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

const PromptSchema = z.object({
  prompt: z.string().max(500).optional(),
});

const TrackSchema = z.object({
  day: z.string(),
  completed: z.boolean(),
});

type DayPlan = {
  day: string;
  type: string;
  subject: string;
  topicId: string;
  topicLabel: string;
  count: number;
  note: string;
  completed?: boolean;
  completedAt?: string | null;
};

function parsePrompt(prompt: string) {
  const lower = prompt.toLowerCase();
  const wantsMath = /\b(math|algebra|geometry|trig|statistics|advanced|quadratic|linear|equation)\b/.test(lower);
  const wantsEla = /\b(ela|english|reading|writing|grammar|punctuation|vocabulary|rhetoric|passage)\b/.test(lower);
  const wantsHard = /\b(hard|harder|advanced|challenge|challenging|difficult)\b/.test(lower);
  const wantsLight = /\b(light|lighter|easy|easier|less|short|quick|busy)\b/.test(lower);
  const wantsHeavy = /\b(more|extra|intense|intensive|heavy|long|grind|daily)\b/.test(lower);

  const topicHints = [
    ...Object.entries(ELA_TOPICS),
    ...Object.entries(MATH_TOPICS),
  ]
    .filter(([id, label]) => lower.includes(id.replace(/-/g, " ")) || lower.includes(label.toLowerCase()))
    .map(([id]) => id);

  return {
    prompt,
    wantsMath,
    wantsEla,
    wantsHard,
    wantsLight,
    wantsHeavy,
    topicHints,
  };
}

function getMonday(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const plan = await prisma.studyPlan.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ plan });
}

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const body = await req.json().catch(() => ({}));
  const parsed = PromptSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const preferences = parsePrompt(parsed.data.prompt?.trim() ?? "");

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
  const boostPromptTopics = (a: typeof allElaTopics[0]) => preferences.topicHints.includes(a.topicId) ? -2 : 0;
  const elaPool = [...allElaTopics].sort((a, b) => (boostPromptTopics(a) + sortFn(a)) - (boostPromptTopics(b) + sortFn(b)));
  const mathPool = [...allMathTopics].sort((a, b) => (boostPromptTopics(a) + sortFn(a)) - (boostPromptTopics(b) + sortFn(b)));

  const days: { day: string; type: string; subject: string; topicId: string; topicLabel: string; count: number; note: string }[] = [];
  const requestedSubject =
    preferences.wantsMath && !preferences.wantsEla ? "math" :
    preferences.wantsEla && !preferences.wantsMath ? "ela" :
    null;
  const countBump = preferences.wantsHeavy ? 5 : preferences.wantsLight ? -5 : 0;
  const intensityNote = preferences.wantsHard
    ? " Aim for hard questions when available."
    : preferences.wantsLight
    ? " Keep this session short and focused."
    : preferences.wantsHeavy
    ? " Add extra reps if you have time."
    : "";
  const promptNote = preferences.prompt ? ` Goal: ${preferences.prompt.slice(0, 110)}${preferences.prompt.length > 110 ? "..." : ""}` : "";

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
    const subject = requestedSubject ?? tmpl.subject;
    const pool = subject === "math" ? mathPool : elaPool;
    const topicPool = pool.filter((t) => t.subject === subject);
    const pick = topicPool[i % topicPool.length] ?? topicPool[0];
    const count = Math.max(5, tmpl.count + countBump);
    days.push({
      day: DAYS[i],
      type: tmpl.type,
      subject,
      topicId: tmpl.type === "mixed" || tmpl.type === "mistake-review" ? "all" : pick.topicId,
      topicLabel: tmpl.type === "mixed" ? "Mixed Practice" : tmpl.type === "mistake-review" ? "Mistake Review" : pick.label,
      count: tmpl.type === "mistake-review" ? 0 : count,
      note: tmpl.note +
        (pick.accuracy !== null && pick.accuracy < 0.7 ? ` (${Math.round(pick.accuracy * 100)}% accuracy — needs work)` : "") +
        intensityNote +
        (i === 0 ? promptNote : ""),
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

export async function PATCH(req: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const parsed = TrackSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const plan = await prisma.studyPlan.findUnique({ where: { userId: user.id } });
  if (!plan) return NextResponse.json({ error: "No saved plan found" }, { status: 404 });

  const days = Array.isArray(plan.days) ? (plan.days as DayPlan[]) : [];
  const updatedDays = days.map((day) => {
    if (day.day !== parsed.data.day) return day;
    return {
      ...day,
      completed: parsed.data.completed,
      completedAt: parsed.data.completed ? new Date().toISOString() : null,
    };
  });

  const updated = await prisma.studyPlan.update({
    where: { userId: user.id },
    data: { days: updatedDays },
  });

  return NextResponse.json({ plan: updated });
}
