import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function buildUsername(name: string | null, userId: string): Promise<string> {
  const base = (name ?? "student").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "student";
  for (let i = 0; i < 10; i++) {
    const username = `${base}_${Math.floor(1000 + Math.random() * 9000)}`;
    const exists = await prisma.gameProfile.findUnique({ where: { username } });
    if (!exists) return username;
  }
  return `user_${userId.slice(0, 8)}`;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, email } = await req.json();
  const displayName = name ?? user.user_metadata?.name ?? null;

  const existing = await prisma.user.findUnique({ where: { id: user.id } });
  if (existing) return NextResponse.json({ user: existing });

  const username = await buildUsername(displayName, user.id);

  const newUser = await prisma.user.create({
    data: {
      id: user.id,
      email: email ?? user.email!,
      name: displayName,
      avatarUrl: user.user_metadata?.avatar_url ?? null,
      stats: { create: {} },
      streak: { create: {} },
      gameProfile: { create: { username } },
    },
  });

  return NextResponse.json({ user: newUser });
}
