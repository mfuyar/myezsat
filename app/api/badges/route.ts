import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
