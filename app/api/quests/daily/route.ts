import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api/auth";
import { getTodayQuests } from "@/lib/game/quests";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const quests = await getTodayQuests(user.id);
  return NextResponse.json({ quests });
}
