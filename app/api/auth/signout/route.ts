import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRequestUrl } from "@/lib/api/url";

export async function POST(req: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(getRequestUrl(req, "/login"));
}
