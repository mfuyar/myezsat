import { prisma } from "@/lib/prisma";

export const BADGE_CATALOG = [
  { key: "first_practice",     name: "First Step",        icon: "🎯", category: "milestone", description: "Complete your first practice session",            condition: "Complete 1 practice session" },
  { key: "streak_7",           name: "Week Warrior",      icon: "🔥", category: "streak",    description: "Study 7 days in a row",                          condition: "7-day streak" },
  { key: "streak_30",          name: "30-Day Legend",     icon: "⚡", category: "streak",    description: "Study 30 days in a row",                         condition: "30-day streak" },
  { key: "mistake_crusher_10", name: "Mistake Crusher",   icon: "💪", category: "milestone", description: "Master 10 mistakes from your notebook",           condition: "Master 10 mistakes" },
  { key: "accuracy_king",      name: "Accuracy King",     icon: "🎖", category: "accuracy",  description: "Score 90%+ on a session with 20+ questions",     condition: "90%+ accuracy on 20+ question session" },
  { key: "perfect_10",         name: "Perfect Score",     icon: "✨", category: "accuracy",  description: "Answer 10 questions in a row without a mistake",  condition: "10 consecutive correct answers" },
  { key: "correct_100",        name: "Century Club",      icon: "💯", category: "milestone", description: "Answer 100 questions correctly in total",         condition: "100 total correct answers" },
  { key: "speed_solver",       name: "Speed Solver",      icon: "⏱", category: "accuracy",  description: "Complete a 10-question session in under 8 minutes", condition: "10 questions in < 8 minutes" },
  { key: "rhetoric_hero",      name: "Rhetoric Hero",     icon: "📝", category: "topic",     description: "Score 80%+ in Rhetoric with 10+ questions",       condition: "80%+ rhetoric accuracy (10+ questions)" },
  { key: "punctuation_pro",    name: "Punctuation Pro",   icon: "·",  category: "topic",     description: "Score 80%+ in Punctuation with 5+ questions",     condition: "80%+ punctuation accuracy (5+ questions)" },
  { key: "vocab_builder",      name: "Vocab Builder",     icon: "📚", category: "topic",     description: "Complete 5 vocabulary practice sessions",          condition: "5 vocabulary sessions" },
  { key: "comeback",           name: "Comeback Student",  icon: "🔄", category: "accuracy",  description: "Score 90%+ after a previous session below 50%",   condition: "90%+ after a <50% session" },
  { key: "full_test",          name: "Full Test Taker",   icon: "📋", category: "milestone", description: "Complete a single session with 30+ questions",    condition: "30+ questions in one session" },
  { key: "daily_devotee_7",    name: "Daily Devotee",     icon: "📅", category: "streak",    description: "Complete daily quests 7 days in a row",           condition: "7 daily quests claimed" },
  { key: "level_3",            name: "Level 3 Unlocked",  icon: "🏆", category: "milestone", description: "Reach Level 3: Problem Solver",                   condition: "Reach level 3 (300 XP)" },
  { key: "first_friend",       name: "Connected",         icon: "🤝", category: "social",    description: "Connect with your first friend",                  condition: "1 accepted friend connection" },
  { key: "challenge_win",      name: "Challenge Winner",  icon: "🥇", category: "social",    description: "Win your first friend challenge",                 condition: "Win 1 challenge" },
  { key: "week_plan_done",     name: "Plan Completer",    icon: "✅", category: "milestone", description: "Complete all 7 days of a weekly study plan",      condition: "Complete weekly study plan" },
  { key: "xp_1000",            name: "XP Hunter",         icon: "⭐", category: "milestone", description: "Earn 1000 XP total",                             condition: "1000 total XP" },
  { key: "no_wrong",           name: "Flawless",          icon: "💎", category: "accuracy",  description: "Get a perfect score on a 10+ question session",   condition: "100% accuracy on 10+ question session" },
] as const;

type BadgeKey = typeof BADGE_CATALOG[number]["key"];

export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  const [
    profile,
    streak,
    practiceSessions,
    practiceAttempts,
    masteredMistakes,
    friendCount,
    challengeWins,
    claimedQuestCount,
    earnedBadgeKeys,
  ] = await Promise.all([
    prisma.gameProfile.findUnique({ where: { userId } }),
    prisma.streak.findUnique({ where: { userId } }),
    prisma.practiceSession.findMany({ where: { userId, completed: true }, select: { correct: true, _count: { select: { attempts: true } } }, orderBy: { startedAt: "asc" } }),
    prisma.practiceAttempt.findMany({ where: { userId }, select: { isCorrect: true, timeSpentSec: true, satQuestion: { select: { topicId: true } }, attemptedAt: true } }),
    prisma.practiceAttempt.count({ where: { userId, masteredAt: { not: null } } }),
    prisma.friendConnection.count({ where: { OR: [{ requesterId: userId }, { receiverId: userId }], status: "accepted" } }),
    prisma.challengeParticipant.count({ where: { userId, rank: 1 } }),
    prisma.studentDailyQuest.count({ where: { userId, status: "claimed" } }),
    prisma.earnedBadge.findMany({ where: { userId }, select: { badgeKey: true } }),
  ]);

  const earned = new Set(earnedBadgeKeys.map((b) => b.badgeKey));
  const toAward: BadgeKey[] = [];

  const totalCorrect = practiceAttempts.filter((a) => a.isCorrect).length;
  const totalXP = profile?.totalXP ?? 0;
  const currentStreak = streak?.current ?? 0;

  // Evaluate each badge
  const checks: [BadgeKey, boolean][] = [
    ["first_practice",     practiceSessions.length >= 1],
    ["streak_7",           currentStreak >= 7],
    ["streak_30",          currentStreak >= 30],
    ["mistake_crusher_10", masteredMistakes >= 10],
    ["accuracy_king",      practiceSessions.some((s) => s._count.attempts >= 20 && s.correct / s._count.attempts >= 0.9)],
    ["perfect_10",         practiceSessions.some((s) => s._count.attempts >= 10 && s.correct === s._count.attempts)],
    ["correct_100",        totalCorrect >= 100],
    ["speed_solver",       practiceSessions.some((s) => {
      const attempts = practiceAttempts.filter((a) => a.isCorrect);
      return s._count.attempts >= 10 && attempts.reduce((t, a) => t + a.timeSpentSec, 0) < 480;
    })],
    ["rhetoric_hero",      (() => {
      const rh = practiceAttempts.filter((a) => a.satQuestion.topicId === "rhetoric");
      return rh.length >= 10 && rh.filter((a) => a.isCorrect).length / rh.length >= 0.8;
    })()],
    ["punctuation_pro",    (() => {
      const p = practiceAttempts.filter((a) => a.satQuestion.topicId === "punctuation");
      return p.length >= 5 && p.filter((a) => a.isCorrect).length / p.length >= 0.8;
    })()],
    ["vocab_builder",      practiceAttempts.filter((a) => a.satQuestion.topicId === "vocabulary").length >= 25],
    ["comeback",           (() => {
      if (practiceSessions.length < 2) return false;
      for (let i = 1; i < practiceSessions.length; i++) {
        const prev = practiceSessions[i - 1];
        const curr = practiceSessions[i];
        const prevAcc = prev.correct / (prev._count.attempts || 1);
        const currAcc = curr.correct / (curr._count.attempts || 1);
        if (prevAcc < 0.5 && currAcc >= 0.9) return true;
      }
      return false;
    })()],
    ["full_test",          practiceSessions.some((s) => s._count.attempts >= 30)],
    ["daily_devotee_7",    claimedQuestCount >= 7],
    ["level_3",            totalXP >= 300],
    ["first_friend",       friendCount >= 1],
    ["challenge_win",      challengeWins >= 1],
    ["xp_1000",            totalXP >= 1000],
    ["no_wrong",           practiceSessions.some((s) => s._count.attempts >= 10 && s.correct === s._count.attempts)],
  ];

  for (const [key, condition] of checks) {
    if (condition && !earned.has(key)) toAward.push(key);
  }

  if (toAward.length > 0) {
    await prisma.earnedBadge.createMany({
      data: toAward.map((key) => ({ userId, badgeKey: key })),
      skipDuplicates: true,
    });
  }

  return toAward;
}
