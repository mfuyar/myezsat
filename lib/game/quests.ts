import { prisma } from "@/lib/prisma";

export const QUEST_CATALOG = [
  { key: "answer_10",   title: "Answer 10 Questions",      description: "Complete 10 practice questions today",          questType: "answer_questions",  targetValue: 10, rewardXP: 30, rewardCoins: 20 },
  { key: "review_3",    title: "Review 3 Mistakes",         description: "Open and read 3 mistake explanations",          questType: "review_mistakes",    targetValue: 3,  rewardXP: 25, rewardCoins: 15 },
  { key: "session_15q", title: "Complete a 15-Q Session",   description: "Finish a practice session with 15+ questions",  questType: "practice_session",   targetValue: 15, rewardXP: 40, rewardCoins: 25 },
  { key: "accuracy_80", title: "Score 80%+ in a Session",   description: "Achieve 80% or better accuracy in any session", questType: "accuracy_target",    targetValue: 80, rewardXP: 35, rewardCoins: 20 },
  { key: "weak_topic",  title: "Practice Your Weak Topic",  description: "Answer 5 questions in your weakest topic",      questType: "weak_topic",         targetValue: 5,  rewardXP: 30, rewardCoins: 20 },
] as const;

export type QuestEvent =
  | { type: "answer_questions"; count: number }
  | { type: "review_mistakes"; count: number }
  | { type: "practice_session"; questionCount: number; accuracy: number }
  | { type: "weak_topic_answer"; count: number };

function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function pickDailyQuests(): string[] {
  // Deterministically pick 3 quests based on day-of-year so all users get same quests
  const keys = QUEST_CATALOG.map((q) => q.key);
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const start = dayOfYear % keys.length;
  const indices = [start % 5, (start + 1) % 5, (start + 2) % 5];
  return [...new Set(indices)].map((i) => keys[i]);
}

export async function assignDailyQuests(userId: string): Promise<void> {
  const today = todayDate();
  const keys = pickDailyQuests();

  await prisma.studentDailyQuest.createMany({
    data: keys.map((questKey) => ({ userId, questKey, assignedAt: today })),
    skipDuplicates: true,
  });
}

export async function getTodayQuests(userId: string) {
  await assignDailyQuests(userId);
  const today = todayDate();
  return prisma.studentDailyQuest.findMany({
    where: { userId, assignedAt: today },
    include: { quest: true },
  });
}

export async function updateQuestProgress(userId: string, event: QuestEvent): Promise<void> {
  const today = todayDate();
  const quests = await prisma.studentDailyQuest.findMany({
    where: { userId, assignedAt: today, status: "active" },
    include: { quest: true },
  });

  for (const q of quests) {
    let increment = 0;
    let autoComplete = false;

    if (event.type === "answer_questions" && q.quest.questType === "answer_questions") {
      increment = event.count;
    } else if (event.type === "review_mistakes" && q.quest.questType === "review_mistakes") {
      increment = event.count;
    } else if (event.type === "practice_session" && q.quest.questType === "practice_session") {
      increment = event.questionCount;
    } else if (event.type === "practice_session" && q.quest.questType === "accuracy_target") {
      if (event.accuracy >= q.quest.targetValue) autoComplete = true;
    } else if (event.type === "weak_topic_answer" && q.quest.questType === "weak_topic") {
      increment = event.count;
    }

    if (increment > 0 || autoComplete) {
      const newProgress = autoComplete ? q.quest.targetValue : Math.min(q.progress + increment, q.quest.targetValue);
      const completed = newProgress >= q.quest.targetValue;
      await prisma.studentDailyQuest.update({
        where: { id: q.id },
        data: {
          progress: newProgress,
          status: completed ? "completed" : "active",
          completedAt: completed ? new Date() : null,
        },
      });
    }
  }
}
