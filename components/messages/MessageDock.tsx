"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Conversation = {
  id: string;
  type: string;
  name: string;
  participants: { userId: string; username: string }[];
  lastMessage: { content: string; createdAt: string } | null;
  unread: boolean;
  updatedAt: string;
};

type MessagePayload = {
  conversations: Conversation[];
  pendingGroupInvites: { id: string }[];
};

const ENABLED_KEY = "myezsat.messageDock.enabled";
const OPEN_KEY = "myezsat.messageDock.openByDefault";

function readStoredBool(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key);
  if (value === null) return fallback;
  return value === "true";
}

export default function MessageDock() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pendingInvites, setPendingInvites] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSettings = () => {
      const nextEnabled = readStoredBool(ENABLED_KEY, true);
      setEnabled(nextEnabled);
      setOpen(nextEnabled && readStoredBool(OPEN_KEY, false));
    };

    loadSettings();
    window.addEventListener("myezsat:message-dock-settings", loadSettings);
    window.addEventListener("storage", loadSettings);
    return () => {
      window.removeEventListener("myezsat:message-dock-settings", loadSettings);
      window.removeEventListener("storage", loadSettings);
    };
  }, []);

  const loadMessages = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const res = await fetch("/api/messages", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as MessagePayload;
      setConversations(data.conversations ?? []);
      setPendingInvites(data.pendingGroupInvites?.length ?? 0);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    loadMessages();
    const interval = window.setInterval(loadMessages, 30_000);
    return () => window.clearInterval(interval);
  }, [enabled, loadMessages]);

  useEffect(() => {
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") loadMessages();
    };
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => document.removeEventListener("visibilitychange", refreshOnFocus);
  }, [loadMessages]);

  const unreadCount = useMemo(
    () => conversations.filter((conversation) => conversation.unread).length + pendingInvites,
    [conversations, pendingInvites]
  );

  if (!enabled || pathname?.startsWith("/messages/")) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <aside className="w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg)] shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Messages</p>
              <p className="text-[10px] text-[var(--muted)]">
                {unreadCount > 0 ? `${unreadCount} unread` : "No unread messages"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/messages" className="text-xs font-medium text-[var(--ela)] hover:opacity-80">
                Open
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-[var(--muted)] hover:text-[var(--text)]"
                aria-label="Close messages"
              >
                x
              </button>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto p-2">
            {loading && conversations.length === 0 ? (
              <p className="px-3 py-4 text-xs text-[var(--muted)]">Loading messages...</p>
            ) : conversations.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <p className="text-sm text-[var(--text)]">No conversations yet</p>
                <Link href="/messages" className="mt-1 block text-xs text-[var(--ela)] hover:opacity-80">
                  Start one from Messages
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {pendingInvites > 0 && (
                  <Link
                    href="/messages"
                    className="rounded-lg border border-[var(--math)]/40 bg-[var(--math-bg)] px-3 py-2 text-xs font-medium text-[var(--text)]"
                  >
                    {pendingInvites} group invite{pendingInvites !== 1 ? "s" : ""} waiting
                  </Link>
                )}
                {conversations.slice(0, 8).map((conversation) => (
                  <Link
                    key={conversation.id}
                    href={`/messages/${conversation.id}`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-[var(--s2)]"
                    onClick={() => setOpen(false)}
                  >
                    <div
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-[var(--bg)]"
                      style={{ background: conversation.type === "group" ? "var(--math)" : "var(--ela)" }}
                    >
                      {conversation.type === "group" ? "G" : conversation.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`truncate text-sm ${conversation.unread ? "font-semibold text-[var(--text)]" : "text-[var(--muted)]"}`}>
                          {conversation.name}
                        </p>
                        {conversation.unread && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[var(--ela)]" />}
                      </div>
                      <p className="truncate text-[11px] text-[var(--muted)]">
                        {conversation.lastMessage?.content ?? "No messages yet"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-full border border-[var(--border)] bg-[var(--text)] px-4 py-2 text-sm font-semibold text-[var(--bg)] shadow-xl transition-transform hover:scale-[1.02]"
      >
        Messages
        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
