/**
 * Seed game catalog (badges + quest types) and create GameProfiles for existing users.
 * Run: npx tsx scripts/seed-game-catalog.ts
 */

import { PrismaClient } from "@prisma/client";
import { BADGE_CATALOG } from "../lib/game/badges";
import { QUEST_CATALOG } from "../lib/game/quests";

const prisma = new PrismaClient();

async function generateUsername(userId: string, name: string | null): Promise<string> {
  const base = (name ?? "student").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "student";
  for (let i = 0; i < 10; i++) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const username = `${base}_${suffix}`;
    const exists = await prisma.gameProfile.findUnique({ where: { username } });
    if (!exists) return username;
  }
  return `user_${userId.slice(0, 8)}`;
}

async function main() {
  console.log("Seeding BadgeCatalog…");
  await prisma.badgeCatalog.createMany({
    data: BADGE_CATALOG.map(({ key, name, description, icon, category, condition }) => ({
      key, name, description, icon, category, condition,
    })),
    skipDuplicates: true,
  });
  console.log(`  ${BADGE_CATALOG.length} badges seeded`);

  console.log("Seeding DailyQuestCatalog…");
  await prisma.dailyQuestCatalog.createMany({
    data: QUEST_CATALOG.map(({ key, title, description, questType, targetValue, rewardXP, rewardCoins }) => ({
      key, title, description, questType, targetValue, rewardXP, rewardCoins,
    })),
    skipDuplicates: true,
  });
  console.log(`  ${QUEST_CATALOG.length} quest types seeded`);

  console.log("Creating GameProfiles for existing users…");
  const users = await prisma.user.findMany({
    where: { gameProfile: null },
    select: { id: true, name: true },
  });

  let created = 0;
  for (const user of users) {
    const username = await generateUsername(user.id, user.name);
    const stats = await prisma.userStats.findUnique({ where: { userId: user.id } });
    const totalXP = stats?.totalXP ?? 0;

    await prisma.gameProfile.create({
      data: { userId: user.id, username, totalXP, level: 1 },
    });
    created++;
    process.stdout.write(`\r  Created ${created}/${users.length} profiles…`);
  }
  console.log("\nDone.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
