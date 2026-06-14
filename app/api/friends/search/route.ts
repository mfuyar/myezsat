import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api/auth";

export async function GET(req: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim().toLowerCase() ?? "";
  if (query.length < 3) return NextResponse.json({ users: [] });

  const connections = await prisma.friendConnection.findMany({
    where: { OR: [{ requesterId: user.id }, { receiverId: user.id }] },
    select: { requesterId: true, receiverId: true },
  });
  const connectedIds = new Set(
    connections.map((connection) =>
      connection.requesterId === user.id ? connection.receiverId : connection.requesterId
    )
  );

  const profiles = await prisma.gameProfile.findMany({
    where: {
      userId: { notIn: [user.id, ...connectedIds] },
      username: { contains: query, mode: "insensitive" },
      privacySetting: { in: ["public", "friends"] },
    },
    select: {
      userId: true,
      username: true,
      level: true,
      weeklyXP: true,
      user: { select: { name: true } },
    },
    orderBy: [{ username: "asc" }],
    take: 8,
  });

  return NextResponse.json({
    users: profiles.map((profile) => ({
      id: profile.userId,
      username: profile.username,
      name: profile.user.name,
      level: profile.level,
      weeklyXP: profile.weeklyXP,
    })),
  });
}
