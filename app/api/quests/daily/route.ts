import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTodayQuests } from "@/lib/game/quests";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quests = await getTodayQuests(user.id);
  return NextResponse.json({ quests });
}
