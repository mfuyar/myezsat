import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connections = await prisma.friendConnection.findMany({
    where: { OR: [{ requesterId: user.id }, { receiverId: user.id }], status: "accepted" },
    select: { requesterId: true, receiverId: true },
  });

  const friendIds = connections.map((c) => c.requesterId === user.id ? c.receiverId : c.requesterId);
  const allIds = [user.id, ...friendIds];

  const entries = await prisma.gameProfile.findMany({
    where: { userId: { in: allIds } },
    orderBy: { weeklyXP: "desc" },
    select: { userId: true, username: true, level: true, weeklyXP: true, totalXP: true },
  });

  const ranked = entries.map((e, i) => ({ ...e, rank: i + 1, isMe: e.userId === user.id }));
  return NextResponse.json({ entries: ranked });
}
