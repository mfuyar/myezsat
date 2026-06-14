import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api/auth";
import { z } from "zod";

const SettingsSchema = z.object({
  enabled: z.boolean(),
  deliveryHour: z.number().int().min(0).max(23),
  timezone: z.string().min(1).max(80),
});

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const subscription = await prisma.wordSubscription.findUnique({ where: { userId: user.id } });

  return NextResponse.json({
    subscription: subscription ?? {
      enabled: false,
      deliveryHour: 8,
      timezone: "America/New_York",
      lastSentAt: null,
    },
  });
}

export async function PUT(req: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const parsed = SettingsSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const subscription = await prisma.wordSubscription.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json({ subscription });
}
