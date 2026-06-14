"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

type DockMessage = {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string | null; gameProfile: { username: string } | null };
};

type DockConversation = {
  id: string;
  type: string;
  name: string | null;
  participants: { userId: string; user: { id: string; name: string | null; gameProfile: { username: string } | null } }[];
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<DockConversation | null>(null);
  const [messages, setMessages] = useState<DockMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? null));
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

  const loadConversation = useCallback(async (conversationId: string) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/messages/${conversationId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setActiveConversation(data.conversation);
      setMessages(data.messages ?? []);
      loadMessages();
    } finally {
      setMessagesLoading(false);
    }
  }, [loadMessages]);

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

  useEffect(() => {
    if (!activeId) return;
    loadConversation(activeId);
  }, [activeId, loadConversation]);

  useEffect(() => {
    if (!activeId) return;
    const interval = window.setInterval(() => loadConversation(activeId), 10_000);
    return () => window.clearInterval(interval);
  }, [activeId, loadConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const unreadCount = useMemo(
    () => conversations.filter((conversation) => conversation.unread).length + pendingInvites,
    [conversations, pendingInvites]
  );

  if (!enabled || pathname?.startsWith("/messages/")) return null;

  async function sendMessage() {
    const text = draft.trim();
    if (!activeId || !text || sending) return;
    setDraft("");
    setSending(true);
    try {
      const res = await fetch(`/api/messages/${activeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        loadMessages();
      }
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  const activeSummary = conversations.find((conversation) => conversation.id === activeId);
  const activeTitle = activeSummary?.name ?? activeConversation?.name ?? "Chat";

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <aside className="w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg)] shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">
                {activeId ? activeTitle : "Messages"}
              </p>
              <p className="text-[10px] text-[var(--muted)]">
                {activeId ? "Right-side chat" : unreadCount > 0 ? `${unreadCount} unread` : "No unread messages"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {activeId && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveId(null);
                    setActiveConversation(null);
                    setMessages([]);
                  }}
                  className="text-xs font-medium text-[var(--muted)] hover:text-[var(--text)]"
                >
                  Back
                </button>
              )}
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

          {activeId ? (
            <div className="flex h-[520px] flex-col">
              <div className="flex-1 overflow-y-auto px-3 py-3">
                {messagesLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--ela)]" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-center">
                    <p className="text-xs text-[var(--muted)]">No messages yet. Say hello!</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {messages.map((message) => {
                      const alignRight = message.senderId === meId;
                      return (
                        <div key={message.id} className={`flex flex-col ${alignRight ? "items-end" : "items-start"}`}>
                          {activeConversation?.type === "group" && !alignRight && (
                            <p className="px-1 text-[9px] text-[var(--muted)]">
                              @{message.sender.gameProfile?.username ?? message.sender.name ?? "user"}
                            </p>
                          )}
                          <div
                            className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                              alignRight
                                ? "rounded-tr-sm text-[var(--bg)]"
                                : "rounded-tl-sm border border-[var(--border)] bg-[var(--s2)] text-[var(--text)]"
                            }`}
                            style={alignRight ? { background: "var(--ela)" } : {}}
                          >
                            {message.content}
                          </div>
                          <p className="px-1 text-[9px] text-[var(--muted)]">{formatTime(message.createdAt)}</p>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              <div className="border-t border-[var(--border)] p-3">
                <div className="flex items-end gap-2 rounded-xl border border-[var(--border)] bg-[var(--s2)] p-2">
                  <textarea
                    rows={1}
                    value={draft}
                    onChange={(event) => {
                      setDraft(event.target.value);
                      event.target.style.height = "auto";
                      event.target.style.height = `${Math.min(event.target.scrollHeight, 110)}px`;
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Message..."
                    className="max-h-[110px] min-h-8 flex-1 resize-none bg-transparent px-1 py-1 text-sm leading-relaxed text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={!draft.trim() || sending}
                    className="h-8 w-8 flex-shrink-0 rounded-lg text-xs font-semibold text-[var(--bg)] disabled:opacity-40"
                    style={{ background: "var(--ela)" }}
                  >
                    Send
                  </button>
                </div>
                <p className="mt-1 px-1 text-[10px] text-[var(--muted)]">Enter sends. Shift+Enter adds a line.</p>
              </div>
            </div>
          ) : (
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
                  <button
                    key={conversation.id}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-[var(--s2)]"
                    onClick={() => setActiveId(conversation.id)}
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
                  </button>
                ))}
              </div>
            )}
          </div>
          )}
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
