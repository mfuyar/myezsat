import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { awardXP } from "@/lib/game/points";
import { z } from "zod";

const Schema = z.object({ questId: z.string() });

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const quest = await prisma.studentDailyQuest.findUnique({
    where: { id: parsed.data.questId },
    include: { quest: true },
  });

  if (!quest || quest.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (quest.status !== "completed") return NextResponse.json({ error: "Quest not completed yet" }, { status: 400 });

  await prisma.studentDailyQuest.update({
    where: { id: quest.id },
    data: { status: "claimed", claimedAt: new Date() },
  });

  const result = await awardXP(user.id, "daily_quest", quest.quest.rewardXP, quest.quest.rewardCoins, quest.id);

  return NextResponse.json({ xpAwarded: result.xpAwarded, coinsAwarded: result.coinsAwarded, leveledUp: result.leveledUp });
}
