"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type TypingPayload = {
  userId: string;
  username: string;
  typing: boolean;
};

export function useTypingIndicator({
  conversationId,
  userId,
  username,
  enabled = true,
}: {
  conversationId: string | null;
  userId: string | null;
  username: string | null;
  enabled?: boolean;
}) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastSentAtRef = useRef(0);
  const stopTimerRef = useRef<number | null>(null);
  const userTimersRef = useRef<Map<string, number>>(new Map());

  const sendTyping = useCallback((typing: boolean) => {
    if (!channelRef.current || !userId || !username) return;
    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { userId, username, typing },
    });
  }, [userId, username]);

  useEffect(() => {
    if (!conversationId || !enabled) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on("broadcast", { event: "typing" }, ({ payload }: { payload: TypingPayload }) => {
        if (!payload?.userId || payload.userId === userId) return;

        const clearUser = () => {
          setTypingUsers((current) => current.filter((name) => name !== payload.username));
          userTimersRef.current.delete(payload.userId);
        };

        if (!payload.typing) {
          clearUser();
          return;
        }

        setTypingUsers((current) => (
          current.includes(payload.username) ? current : [...current, payload.username]
        ));

        const existingTimer = userTimersRef.current.get(payload.userId);
        if (existingTimer) window.clearTimeout(existingTimer);
        userTimersRef.current.set(payload.userId, window.setTimeout(clearUser, 3000));
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      sendTyping(false);
      if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
      userTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      userTimersRef.current.clear();
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [conversationId, enabled, sendTyping, userId]);

  const announceTyping = useCallback(() => {
    if (!enabled) return;

    const now = Date.now();
    if (now - lastSentAtRef.current > 1000) {
      sendTyping(true);
      lastSentAtRef.current = now;
    }

    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    stopTimerRef.current = window.setTimeout(() => sendTyping(false), 1800);
  }, [enabled, sendTyping]);

  const announceStopped = useCallback(() => {
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    sendTyping(false);
  }, [sendTyping]);

  return { typingUsers, announceTyping, announceStopped };
}
