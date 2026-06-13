import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const participations = await prisma.conversationParticipant.findMany({
    where: { userId: user.id },
    include: {
      conversation: {
        include: {
          participants: {
            include: { user: { select: { id: true, name: true, gameProfile: { select: { username: true } } } } },
          },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
    orderBy: { conversation: { updatedAt: "desc" } },
  });

  const conversations = participations.map((p) => {
    const conv = p.conversation;
    const others = conv.participants.filter((x) => x.userId !== user.id);
    const lastMsg = conv.messages[0] ?? null;
    const unread = lastMsg && p.lastReadAt ? new Date(lastMsg.createdAt) > new Date(p.lastReadAt) : !!lastMsg;

    return {
      id: conv.id,
      type: conv.type,
      name: conv.type === "group" ? conv.name : others[0]?.user.gameProfile?.username ?? others[0]?.user.name ?? "Unknown",
      participants: conv.participants.map((x) => ({
        userId: x.userId,
        username: x.user.gameProfile?.username ?? x.user.name ?? "?",
      })),
      lastMessage: lastMsg ? { content: lastMsg.content, createdAt: lastMsg.createdAt } : null,
      unread,
      updatedAt: conv.updatedAt,
    };
  });

  return NextResponse.json({ conversations });
}

const CreateSchema = z.object({
  type: z.enum(["dm", "group"]).default("dm"),
  name: z.string().max(50).optional(),
  participantIds: z.array(z.string()).min(1).max(20),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { type, name, participantIds } = parsed.data;
  const allIds = [...new Set([user.id, ...participantIds])];

  // For DMs, check if conversation already exists
  if (type === "dm" && participantIds.length === 1) {
    const existing = await prisma.conversation.findFirst({
      where: {
        type: "dm",
        participants: { every: { userId: { in: allIds } } },
        AND: [{ participants: { some: { userId: user.id } } }, { participants: { some: { userId: participantIds[0] } } }],
      },
    });
    if (existing) return NextResponse.json({ conversation: existing, existing: true });
  }

  // Verify all participants are friends (for DMs) — skip check for group chats by tutor/admin
  if (type === "dm") {
    const friendConn = await prisma.friendConnection.findFirst({
      where: { OR: [{ requesterId: user.id, receiverId: participantIds[0] }, { requesterId: participantIds[0], receiverId: user.id }], status: "accepted" },
    });
    if (!friendConn) {
      const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
      if (dbUser?.role !== "admin" && dbUser?.role !== "tutor") {
        return NextResponse.json({ error: "You can only message friends" }, { status: 403 });
      }
    }
  }

  const conversation = await prisma.conversation.create({
    data: {
      type,
      name: type === "group" ? (name ?? "Group Chat") : null,
      participants: { create: allIds.map((id) => ({ userId: id })) },
    },
  });

  return NextResponse.json({ conversation, existing: false }, { status: 201 });
}
