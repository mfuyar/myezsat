import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entries = await prisma.gameProfile.findMany({
    where: { privacySetting: { in: ["public", "friends"] } },
    orderBy: { weeklyXP: "desc" },
    take: 20,
    select: { userId: true, username: true, level: true, weeklyXP: true, totalXP: true },
  });

  const ranked = entries.map((e, i) => ({ ...e, rank: i + 1, isMe: e.userId === user.id }));
  const myEntry = ranked.find((e) => e.isMe);
  const myRank = myEntry?.rank ?? null;

  return NextResponse.json({ entries: ranked, myRank });
}
