import { prisma } from "@/lib/prisma";
import { ELA_SYSTEM, MATH_SYSTEM } from "@/lib/ai/prompts";
import { ELA_TOPICS, MATH_TOPICS, type Subject } from "@/types";

type TutorAgentInput = {
  userId: string;
  subject: Subject;
  topicLabel: string;
  difficulty: string;
};

const TUTOR_SKILLS = [
  {
    name: "Socratic Hinting",
    trigger: "Use when the student asks for help, is stuck, or gives a partial answer.",
    behavior: "Ask one focused question or give one small clue before revealing the full solution.",
  },
  {
    name: "Mistake Diagnosis",
    trigger: "Use after wrong answers or confused work.",
    behavior: "Identify the exact misconception, then give a corrected mini-example.",
  },
  {
    name: "Formula and Setup Check",
    trigger: "Use for SAT math questions where the core skill is choosing the right formula, equation setup, diagram relationship, function model, unit/rate setup, or multi-step plan.",
    behavior: "Require or show the key setup, then give a compact numbered solution. For simple mental-answer questions, accept correct answers first and offer a short optional 2-3 step proper method.",
  },
  {
    name: "Grammar Rule Explanation",
    trigger: "Use for punctuation, grammar, transitions, concision, and sentence structure.",
    behavior: "State the rule, show why wrong choices fail, then apply the rule to the sentence.",
  },
  {
    name: "Vocabulary Context Clues",
    trigger: "Use for vocabulary in context and word choice.",
    behavior: "Use nearby clues, tone, and contrast words before revealing the answer.",
  },
  {
    name: "Adaptive Review",
    trigger: "Use when the student has repeated misses, low accuracy, or slow timing.",
    behavior: "Lower the step size, review the prerequisite, then give one similar original practice item.",
  },
  {
    name: "Challenge Mode",
    trigger: "Use when the student is accurate and fast.",
    behavior: "Increase difficulty, ask for a faster method, or compare two solution paths.",
  },
  {
    name: "Similar Question Generator",
    trigger: "Use when asked for more practice.",
    behavior: "Create an original SAT-style question that tests the same skill without copying official material.",
  },
];

function topicName(subject: Subject, topicId: string) {
  const topics = subject === "math" ? MATH_TOPICS : ELA_TOPICS;
  return topics.find((topic) => topic.id === topicId)?.label ?? topicId.replace(/-/g, " ");
}

function pct(correct: number, total: number) {
  if (total === 0) return null;
  return Math.round((correct / total) * 100);
}

function summarizeAttempts(
  attempts: {
    isCorrect: boolean;
    timeSpentSec: number;
    satQuestion: { subject: string; topicId: string; difficulty: string };
  }[],
  subject: Subject
) {
  const byTopic = new Map<string, { correct: number; total: number; time: number }>();

  for (const attempt of attempts) {
    if (attempt.satQuestion.subject !== subject) continue;
    const topic = attempt.satQuestion.topicId;
    const current = byTopic.get(topic) ?? { correct: 0, total: 0, time: 0 };
    byTopic.set(topic, {
      correct: current.correct + (attempt.isCorrect ? 1 : 0),
      total: current.total + 1,
      time: current.time + attempt.timeSpentSec,
    });
  }

  const rows = [...byTopic.entries()]
    .map(([topicId, data]) => ({
      topicId,
      label: topicName(subject, topicId),
      accuracy: pct(data.correct, data.total) ?? 0,
      total: data.total,
      avgTime: data.total ? Math.round(data.time / data.total) : 0,
    }))
    .filter((row) => row.total >= 2)
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total);

  return {
    weak: rows.slice(0, 3),
    strong: [...rows].sort((a, b) => b.accuracy - a.accuracy || b.total - a.total).slice(0, 2),
  };
}

function teachingStyleFromAttempts(
  attempts: { isCorrect: boolean; timeSpentSec: number }[]
) {
  if (attempts.length < 3) return "Start with concise guidance, then adapt based on the student's answer.";

  const accuracy = pct(
    attempts.filter((attempt) => attempt.isCorrect).length,
    attempts.length
  ) ?? 0;
  const avgTime = Math.round(
    attempts.reduce((sum, attempt) => sum + attempt.timeSpentSec, 0) / attempts.length
  );

  if (accuracy < 60) {
    return "Use extra scaffolding: one hint at a time, simpler prerequisite checks, and short confidence-building wins.";
  }
  if (avgTime > 120) {
    return "Prioritize efficient methods, pattern recognition, and shorter solution paths.";
  }
  if (accuracy >= 85 && avgTime < 75) {
    return "Use Challenge Mode: harder questions, faster methods, and precision checks.";
  }
  return "Use balanced tutoring: ask first, explain clearly, then give a similar original practice item.";
}

export async function buildTutorAgentInstruction({
  userId,
  subject,
  topicLabel,
  difficulty,
}: TutorAgentInput) {
  const baseSystem = subject === "math" ? MATH_SYSTEM : ELA_SYSTEM;

  const [latestScore, recentAttempts, globalMisses] = await Promise.all([
    prisma.scoreEntry.findFirst({
      where: { userId },
      orderBy: { testDate: "desc" },
      select: { testType: true, testName: true, totalScore: true, mathScore: true, rwScore: true },
    }),
    prisma.practiceAttempt.findMany({
      where: { userId },
      orderBy: { attemptedAt: "desc" },
      take: 80,
      select: {
        isCorrect: true,
        timeSpentSec: true,
        satQuestion: { select: { subject: true, topicId: true, difficulty: true } },
      },
    }),
    prisma.practiceAttempt.findMany({
      where: { isCorrect: false, satQuestion: { subject } },
      orderBy: { attemptedAt: "desc" },
      take: 120,
      select: {
        satQuestion: { select: { topicId: true, difficulty: true } },
      },
    }),
  ]);

  const summary = summarizeAttempts(recentAttempts, subject);
  const style = teachingStyleFromAttempts(recentAttempts);

  const globalTopicCounts = new Map<string, number>();
  for (const miss of globalMisses) {
    const topic = miss.satQuestion.topicId;
    globalTopicCounts.set(topic, (globalTopicCounts.get(topic) ?? 0) + 1);
  }
  const globalPatterns = [...globalTopicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topicId, count]) => `${topicName(subject, topicId)} (${count} recent misses)`);

  const scoreContext = latestScore
    ? `Latest score: ${latestScore.testName ? `${latestScore.testType.toUpperCase()} ${latestScore.testName}` : latestScore.testType.toUpperCase()} ${latestScore.totalScore} total; Math ${latestScore.mathScore}, R&W ${latestScore.rwScore}.`
    : "No score entry yet.";

  return `${baseSystem}

TUTOR AGENT:
You are not just answering. You are acting as an adaptive SAT tutor agent.
For each turn, silently choose the best skill, teaching style, and next action based on student data.

AVAILABLE SKILLS:
${TUTOR_SKILLS.map((skill, index) => `${index + 1}. ${skill.name}
Trigger: ${skill.trigger}
Behavior: ${skill.behavior}`).join("\n")}

STUDENT MEMORY:
- Current focus: ${subject.toUpperCase()} / ${topicLabel} / ${difficulty}
- ${scoreContext}
- Preferred teaching style inferred from practice: ${style}
- Weak topics in this section: ${summary.weak.map((row) => `${row.label}: ${row.accuracy}% over ${row.total} attempts, avg ${row.avgTime}s`).join("; ") || "not enough data yet"}
- Strong topics in this section: ${summary.strong.map((row) => `${row.label}: ${row.accuracy}% over ${row.total} attempts`).join("; ") || "not enough data yet"}

ANONYMOUS CLASSROOM INSIGHTS:
- Recent common miss patterns for this section: ${globalPatterns.join("; ") || "not enough data yet"}
- Use these only as broad teaching intuition. Never reveal or imply another user's private data.

AGENT DECISION RULES:
- If the student asks for a question, create an original SAT-style item or pull from the saved question-bank behavior when available.
- If the student is wrong or uncertain, use Mistake Diagnosis before giving another problem.
- If the student is doing well, use Challenge Mode.
- If the student asks for "just answer", still give a concise reason so they learn the pattern.
- If the student gives a correct short answer, do not automatically demand steps. Require setup only when the SAT skill depends on formula/model choice; otherwise confirm and include a compact 2-3 step proper method when useful.
- Learn from the student's behavior over time by adapting tone, hints, pacing, and difficulty from the stored practice history.`;
}

export function buildDemoTutorAgentInstruction({
  subject,
  topicLabel,
  difficulty,
}: {
  subject: Subject;
  topicLabel: string;
  difficulty: string;
}) {
  const baseSystem = subject === "math" ? MATH_SYSTEM : ELA_SYSTEM;

  return `${baseSystem}

TUTOR AGENT:
Act as an adaptive SAT tutor with skills. Since this is a demo with no saved student memory, infer the best skill from the current message only.

AVAILABLE SKILLS:
${TUTOR_SKILLS.map((skill, index) => `${index + 1}. ${skill.name}: ${skill.behavior}`).join("\n")}

CURRENT FOCUS:
- ${subject.toUpperCase()} / ${topicLabel} / ${difficulty}

AGENT DECISION RULES:
- Use Socratic Hinting before full answers unless the student asks for a direct explanation.
- Create only original SAT-style examples and questions.
- If the student gives a correct short answer, accept it. Require setup only for formula/model-dependent SAT math; otherwise give a compact optional proper method when useful.
- Adapt difficulty and pacing from the user's responses during this demo.`;
}
