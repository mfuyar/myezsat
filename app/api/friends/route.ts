import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureGameProfile } from "@/lib/game/usernames";
import { requireApiUser } from "@/lib/api/auth";
import { z } from "zod";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;
  const me = await ensureGameProfile(user.id);

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

  return NextResponse.json({ me, friends, pendingReceived, pendingSent });
}

const RequestSchema = z.object({ username: z.string().min(3).max(100) });

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const body = await req.json();
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const lookup = parsed.data.username.trim().toLowerCase();
  let target = await prisma.gameProfile.findUnique({ where: { username: lookup }, select: { userId: true } });
  if (!target && lookup.includes("@")) {
    const targetUser = await prisma.user.findUnique({ where: { email: lookup }, select: { id: true } });
    if (targetUser) {
      const profile = await ensureGameProfile(targetUser.id);
      target = { userId: profile.userId };
    }
  }

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
