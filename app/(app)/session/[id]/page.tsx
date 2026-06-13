import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import ChatSession from "@/components/session/ChatSession";
import type { StudySession, ChatMessage } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SessionPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return notFound();

  const session = await prisma.studySession.findFirst({
    where: { id, userId: user.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!session) return notFound();

  const clientSession: StudySession & { messages: ChatMessage[] } = {
    id: session.id,
    userId: session.userId,
    subject: session.subject as "math" | "ela",
    topicId: session.topicId,
    topicLabel: session.topicLabel,
    difficulty: session.difficulty as "easy" | "medium" | "hard",
    durationSec: session.durationSec,
    xpEarned: session.xpEarned,
    correct: session.correct,
    total: session.total,
    completed: session.completed,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString(),
    messages: session.messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  };

  return <ChatSession session={clientSession} />;
}
