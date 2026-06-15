import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api/auth";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const [participations, pendingFriendRequests, pendingGroupInvites] = await Promise.all([
    prisma.conversationParticipant.findMany({
      where: { userId: user.id, status: "accepted" },
      select: { conversationId: true, lastReadAt: true },
    }),
    prisma.friendConnection.count({
      where: { receiverId: user.id, status: "pending" },
    }),
    prisma.conversationParticipant.count({
      where: { userId: user.id, status: "pending", conversation: { type: "group" } },
    }),
  ]);

  const unreadMessages = await Promise.all(
    participations.map((participant) => (
      prisma.conversationMessage.count({
        where: {
          conversationId: participant.conversationId,
          senderId: { not: user.id },
          ...(participant.lastReadAt ? { createdAt: { gt: participant.lastReadAt } } : {}),
        },
      })
    ))
  ).then((counts) => counts.reduce((total, count) => total + count, 0));

  return NextResponse.json({
    unreadMessages,
    pendingFriendRequests,
    pendingGroupInvites,
    messagesTotal: unreadMessages + pendingGroupInvites,
    total: unreadMessages + pendingGroupInvites + pendingFriendRequests,
  });
}
