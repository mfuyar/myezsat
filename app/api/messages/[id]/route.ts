import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, forbidden } from "@/lib/api/auth";
import { z } from "zod";

async function getParticipant(conversationId: string, userId: string) {
  return prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const { id } = await params;
  const participant = await getParticipant(id, user.id);
  if (!participant || participant.status !== "accepted") return forbidden();

  const { searchParams } = new URL(req.url);
  const before = searchParams.get("before");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

  const [conversation, messages] = await Promise.all([
    prisma.conversation.findUnique({
      where: { id },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, gameProfile: { select: { username: true } } } } },
        },
      },
    }),
    prisma.conversationMessage.findMany({
      where: { conversationId: id, ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
      include: { sender: { select: { id: true, name: true, gameProfile: { select: { username: true } } } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Mark as read
  await prisma.conversationParticipant.update({
    where: { id: participant.id },
    data: { lastReadAt: new Date() },
  });

  return NextResponse.json({ conversation, messages: messages.reverse() });
}

const SendSchema = z.object({ content: z.string().min(1).max(2000) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const { id } = await params;
  const participant = await getParticipant(id, user.id);
  if (!participant || participant.status !== "accepted") return forbidden();

  const body = await req.json();
  const parsed = SendSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [message] = await prisma.$transaction([
    prisma.conversationMessage.create({
      data: { conversationId: id, senderId: user.id, content: parsed.data.content },
      include: { sender: { select: { id: true, name: true, gameProfile: { select: { username: true } } } } },
    }),
    prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } }),
  ]);

  return NextResponse.json({ message }, { status: 201 });
}

const InviteActionSchema = z.object({ action: z.enum(["accept", "decline"]) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const { id } = await params;
  const participant = await getParticipant(id, user.id);
  if (!participant || participant.status !== "pending") {
    return NextResponse.json({ error: "No pending invite" }, { status: 404 });
  }

  const parsed = InviteActionSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.action === "decline") {
    await prisma.conversationParticipant.delete({ where: { id: participant.id } });
    return NextResponse.json({ ok: true });
  }

  const updated = await prisma.conversationParticipant.update({
    where: { id: participant.id },
    data: { status: "accepted", joinedAt: new Date(), lastReadAt: new Date() },
  });

  await prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } });
  return NextResponse.json({ participant: updated });
}
