import { prisma } from "@/lib/prisma";
import { levelFromXP } from "./levels";
import { uniqueUsername } from "./usernames";

export const XP_RULES: Record<string, number> = {
  correct_easy:     5,
  correct_medium:   8,
  correct_hard:    12,
  mistake_mastered: 15,
  session_complete: 20,
  streak_bonus:     10,
  daily_quest:      30, // base; actual value comes from quest catalog
  challenge_win:    50,
};

export const COIN_RULES: Record<string, number> = {
  session_complete: 10,
  daily_quest:      20,
  challenge_win:    50,
  mistake_mastered:  5,
};

// Anti-cheat: max 3 XP awards for same question per 24h
export async function canAwardPoints(userId: string, satQuestionId: string): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const count = await prisma.pointTransaction.count({
    where: {
      userId,
      relatedId: satQuestionId,
      actionType: { in: ["correct_easy", "correct_medium", "correct_hard"] },
      createdAt: { gte: since },
    },
  });
  return count < 3;
}

interface AwardResult {
  xpAwarded: number;
  coinsAwarded: number;
  leveledUp: boolean;
  newLevel: number;
}

export async function awardXP(
  userId: string,
  actionType: string,
  xp: number,
  coins = 0,
  relatedId?: string,
): Promise<AwardResult> {
  if (xp <= 0 && coins <= 0) return { xpAwarded: 0, coinsAwarded: 0, leveledUp: false, newLevel: 1 };

  // Write transaction record
  await prisma.pointTransaction.create({
    data: { userId, actionType, xpAwarded: xp, coinsAwarded: coins, relatedId: relatedId ?? null },
  });

  // Get current profile to detect level-up
  const profile = await prisma.gameProfile.findUnique({ where: { userId } });
  const prevLevel = profile ? levelFromXP(profile.totalXP) : 1;

  // Refresh weekly/monthly XP if needed
  const now = new Date();
  const weekReset = getMonday(now);
  const monthReset = getFirstOfMonth(now);

  const needsWeekReset = !profile?.weeklyXPReset || profile.weeklyXPReset < weekReset;
  const needsMonthReset = !profile?.monthlyXPReset || profile.monthlyXPReset < monthReset;

  const updated = await prisma.gameProfile.upsert({
    where: { userId },
    create: {
      userId,
      username: await generateUsername(userId),
      totalXP: xp,
      weeklyXP: xp,
      monthlyXP: xp,
      coins,
      level: levelFromXP(xp),
      weeklyXPReset: weekReset,
      monthlyXPReset: monthReset,
    },
    update: {
      totalXP: { increment: xp },
      weeklyXP:  needsWeekReset  ? xp : { increment: xp },
      monthlyXP: needsMonthReset ? xp : { increment: xp },
      coins: { increment: coins },
      ...(needsWeekReset  ? { weeklyXPReset:  weekReset  } : {}),
      ...(needsMonthReset ? { monthlyXPReset: monthReset } : {}),
    },
  });

  const newLevel = levelFromXP(updated.totalXP);
  const leveledUp = newLevel > prevLevel;
  if (leveledUp) {
    await prisma.gameProfile.update({ where: { userId }, data: { level: newLevel } });
  }

  return { xpAwarded: xp, coinsAwarded: coins, leveledUp, newLevel };
}

async function generateUsername(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
  return uniqueUsername(user?.email, user?.name);
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function getFirstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
