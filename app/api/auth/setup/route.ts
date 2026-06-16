import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { uniqueUsername } from "@/lib/game/usernames";
import { invokeVocabEmailFunction } from "@/lib/supabase-functions";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, email, agreedToTerms } = await req.json();
  if (agreedToTerms !== true) {
    return NextResponse.json({ error: "Terms agreement is required." }, { status: 400 });
  }

  const displayName = name ?? user.user_metadata?.name ?? null;

  const existing = await prisma.user.findUnique({ where: { id: user.id } });
  if (existing) {
    if (existing.deletedAt) {
      return NextResponse.json({ error: "Account deleted" }, { status: 403 });
    }
    if (existing.suspended) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        agreedToTerms: true,
        agreedAt: existing.agreedAt ?? new Date(),
      },
    });
    return NextResponse.json({ user: updated });
  }

  const userEmail = email ?? user.email!;
  const username = await uniqueUsername(userEmail, displayName);

  const newUser = await prisma.user.create({
    data: {
      id: user.id,
      email: userEmail,
      name: displayName,
      avatarUrl: user.user_metadata?.avatar_url ?? null,
      agreedToTerms: true,
      agreedAt: new Date(),
      stats: { create: {} },
      streak: { create: {} },
      gameProfile: { create: { username } },
    },
  });

  try {
    await invokeVocabEmailFunction({
      action: "send-welcome",
      to: newUser.email,
      name: newUser.name,
    });
  } catch (error) {
    console.error("Could not send welcome email", error);
  }

  return NextResponse.json({ user: newUser });
}
