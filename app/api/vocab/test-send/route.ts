import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api/auth";
import { invokeVocabEmailFunction } from "@/lib/supabase-functions";

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, name: true },
  });

  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  try {
    const result = await invokeVocabEmailFunction({
      action: "send-test",
      userId: user.id,
      to: dbUser.email,
      name: dbUser.name,
      dryRun: body.dryRun ?? false,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send test email." },
      { status: 500 }
    );
  }
}
