import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api/auth";
import { z } from "zod";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

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

  const pendingGroupInvites = participations
    .filter((p) => p.status === "pending" && p.conversation.type === "group")
    .map((p) => ({
      id: p.conversation.id,
      name: p.conversation.name ?? "Group Chat",
      participants: p.conversation.participants.map((x) => ({
        userId: x.userId,
        username: x.user.gameProfile?.username ?? x.user.name ?? "?",
      })),
      createdAt: p.conversation.createdAt,
    }));

  const acceptedParticipations = participations.filter((p) => p.status === "accepted");
  const unreadCounts = await Promise.all(
    acceptedParticipations.map((p) => (
      prisma.conversationMessage.count({
        where: {
          conversationId: p.conversationId,
          senderId: { not: user.id },
          ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
        },
      })
    ))
  );

  const conversations = acceptedParticipations.map((p, index) => {
    const conv = p.conversation;
    const acceptedParticipants = conv.participants.filter((x) => x.status === "accepted");
    const others = acceptedParticipants.filter((x) => x.userId !== user.id);
    const lastMsg = conv.messages[0] ?? null;
    const unreadCount = unreadCounts[index] ?? 0;

    return {
      id: conv.id,
      type: conv.type,
      name: conv.type === "group" ? conv.name : others[0]?.user.gameProfile?.username ?? others[0]?.user.name ?? "Unknown",
      participants: acceptedParticipants.map((x) => ({
        userId: x.userId,
        username: x.user.gameProfile?.username ?? x.user.name ?? "?",
      })),
      lastMessage: lastMsg ? { content: lastMsg.content, createdAt: lastMsg.createdAt } : null,
      unread: unreadCount > 0,
      unreadCount,
      updatedAt: conv.updatedAt,
    };
  });

  return NextResponse.json({ conversations, pendingGroupInvites });
}

const CreateSchema = z.object({
  type: z.enum(["dm", "group"]).default("dm"),
  name: z.string().max(50).optional(),
  participantIds: z.array(z.string()).min(1).max(20),
});

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

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

  // Verify participants are accepted friends unless the creator is staff.
  if (user.role !== "admin" && user.role !== "tutor") {
    const friendCount = await prisma.friendConnection.count({
      where: {
        status: "accepted",
        OR: participantIds.map((id) => ({ requesterId: user.id, receiverId: id })).concat(
          participantIds.map((id) => ({ requesterId: id, receiverId: user.id }))
        ),
      },
    });
    if (friendCount < participantIds.length) {
      return NextResponse.json({ error: "You can only message accepted friends" }, { status: 403 });
    }
  }

  const conversation = await prisma.conversation.create({
    data: {
      type,
      name: type === "group" ? (name ?? "Group Chat") : null,
      participants: {
        create: allIds.map((id) => ({
          userId: id,
          status: type === "group" && id !== user.id ? "pending" : "accepted",
        })),
      },
    },
  });

  return NextResponse.json({ conversation, existing: false }, { status: 201 });
}
