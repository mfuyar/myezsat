import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api/auth";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const [catalog, earned] = await Promise.all([
    prisma.badgeCatalog.findMany({ orderBy: { category: "asc" } }),
    prisma.earnedBadge.findMany({ where: { userId: user.id }, select: { badgeKey: true, earnedAt: true } }),
  ]);

  const earnedMap = new Map(earned.map((e) => [e.badgeKey, e.earnedAt]));
  const badges = catalog.map((b) => ({
    ...b,
    earned: earnedMap.has(b.key),
    earnedAt: earnedMap.get(b.key) ?? null,
  }));

  return NextResponse.json({ badges, earnedCount: earned.length, totalCount: catalog.length });
}
