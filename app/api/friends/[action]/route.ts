import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { awardXP } from "@/lib/game/points";
import { checkAndAwardBadges } from "@/lib/game/badges";

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action } = await params;
  const { connectionId } = await req.json();

  const connection = await prisma.friendConnection.findUnique({ where: { id: connectionId } });
  if (!connection) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "accept") {
    if (connection.receiverId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await prisma.friendConnection.update({ where: { id: connectionId }, data: { status: "accepted" } });
    // Award "first_friend" badge to both
    await Promise.all([
      awardXP(user.id, "first_friend", 0, 0),
      awardXP(connection.requesterId, "first_friend", 0, 0),
      checkAndAwardBadges(user.id),
      checkAndAwardBadges(connection.requesterId),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (action === "decline") {
    if (connection.receiverId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await prisma.friendConnection.delete({ where: { id: connectionId } });
    return NextResponse.json({ ok: true });
  }

  if (action === "remove") {
    const isParticipant = connection.requesterId === user.id || connection.receiverId === user.id;
    if (!isParticipant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await prisma.friendConnection.delete({ where: { id: connectionId } });
    return NextResponse.json({ ok: true });
  }

  if (action === "block") {
    const isParticipant = connection.requesterId === user.id || connection.receiverId === user.id;
    if (!isParticipant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await prisma.friendConnection.update({ where: { id: connectionId }, data: { status: "blocked" } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
