import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getLevelInfo } from "@/lib/game/levels";
import { z } from "zod";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [profile, streak, earnedBadges] = await Promise.all([
    prisma.gameProfile.findUnique({ where: { userId: user.id } }),
    prisma.streak.findUnique({ where: { userId: user.id } }),
    prisma.earnedBadge.findMany({ where: { userId: user.id }, include: { badge: true }, orderBy: { earnedAt: "desc" }, take: 5 }),
  ]);

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const levelInfo = getLevelInfo(profile.totalXP);
  return NextResponse.json({ profile, levelInfo, streak, recentBadges: earnedBadges });
}

const UpdateSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-z0-9_]+$/).optional(),
  privacySetting: z.enum(["public", "friends", "private"]).optional(),
});

export async function PUT(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.username) {
    const exists = await prisma.gameProfile.findFirst({ where: { username: parsed.data.username, userId: { not: user.id } } });
    if (exists) return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  const updated = await prisma.gameProfile.update({ where: { userId: user.id }, data: parsed.data });
  return NextResponse.json({ profile: updated });
}
