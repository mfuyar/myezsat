import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [accepted, pendingReceived, pendingSent] = await Promise.all([
    prisma.friendConnection.findMany({
      where: { OR: [{ requesterId: user.id }, { receiverId: user.id }], status: "accepted" },
      include: {
        requester: { select: { id: true, name: true, gameProfile: { select: { username: true, level: true, weeklyXP: true } } } },
        receiver:  { select: { id: true, name: true, gameProfile: { select: { username: true, level: true, weeklyXP: true } } } },
      },
    }),
    prisma.friendConnection.findMany({
      where: { receiverId: user.id, status: "pending" },
      include: { requester: { select: { id: true, name: true, gameProfile: { select: { username: true, level: true } } } } },
    }),
    prisma.friendConnection.findMany({
      where: { requesterId: user.id, status: "pending" },
      include: { receiver: { select: { id: true, name: true, gameProfile: { select: { username: true, level: true } } } } },
    }),
  ]);

  const friends = accepted.map((c) => {
    const other = c.requesterId === user.id ? c.receiver : c.requester;
    return { connectionId: c.id, ...other };
  });

  return NextResponse.json({ friends, pendingReceived, pendingSent });
}

const RequestSchema = z.object({ username: z.string().min(3).max(20) });

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const target = await prisma.gameProfile.findUnique({ where: { username: parsed.data.username }, select: { userId: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.userId === user.id) return NextResponse.json({ error: "Can't friend yourself" }, { status: 400 });

  const existing = await prisma.friendConnection.findFirst({
    where: { OR: [{ requesterId: user.id, receiverId: target.userId }, { requesterId: target.userId, receiverId: user.id }] },
  });
  if (existing) return NextResponse.json({ error: "Connection already exists", status: existing.status }, { status: 409 });

  const connection = await prisma.friendConnection.create({
    data: { requesterId: user.id, receiverId: target.userId },
  });

  return NextResponse.json({ connection }, { status: 201 });
}
