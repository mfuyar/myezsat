"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";

type DockSize = "compact" | "standard" | "wide";

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
const SIZE_KEY = "myezsat.messageDock.size";

const WIDTH_BY_SIZE: Record<DockSize, string> = {
  compact: "lg:w-[340px]",
  standard: "lg:w-[420px]",
  wide: "lg:w-[520px]",
};

function readStoredBool(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key);
  if (value === null) return fallback;
  return value === "true";
}

function readStoredSize() {
  if (typeof window === "undefined") return "standard" as DockSize;
  const value = window.localStorage.getItem(SIZE_KEY);
  return value === "compact" || value === "wide" || value === "standard" ? value : "standard";
}

export default function MessageDock() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [dockSize, setDockSize] = useState<DockSize>("standard");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pendingInvites, setPendingInvites] = useState(0);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<DockConversation | null>(null);
  const [messages, setMessages] = useState<DockMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadSettings = () => {
      const nextEnabled = readStoredBool(ENABLED_KEY, true);
      setEnabled(nextEnabled);
      setOpen(nextEnabled && readStoredBool(OPEN_KEY, false));
      setDockSize(readStoredSize());
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
    setListError(null);
    try {
      const res = await fetch("/api/messages", { cache: "no-store" });
      if (!res.ok) {
        setListError("Could not load messages.");
        return;
      }
      const data = (await res.json()) as MessagePayload;
      setConversations(data.conversations ?? []);
      setPendingInvites(data.pendingGroupInvites?.length ?? 0);
    } catch {
      setListError("Could not connect to messages.");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  const loadConversation = useCallback(async (conversationId: string) => {
    setMessagesLoading(true);
    setChatError(null);
    try {
      const res = await fetch(`/api/messages/${conversationId}`, { cache: "no-store" });
      if (!res.ok) {
        setChatError("Could not load this chat.");
        return;
      }
      const data = await res.json();
      setActiveConversation(data.conversation);
      setMessages(data.messages ?? []);
      loadMessages();
    } catch {
      setChatError("Could not connect to this chat.");
    } finally {
      setMessagesLoading(false);
    }
  }, [loadMessages]);

  useEffect(() => {
    if (!enabled) return;
    loadMessages();
    const interval = window.setInterval(loadMessages, open ? 45_000 : 90_000);
    return () => window.clearInterval(interval);
  }, [enabled, open, loadMessages]);

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
    if (!activeId || !open) return;
    const interval = window.setInterval(() => loadConversation(activeId), 15_000);
    return () => window.clearInterval(interval);
  }, [activeId, open, loadConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const unreadCount = useMemo(
    () => conversations.filter((conversation) => conversation.unread).length + pendingInvites,
    [conversations, pendingInvites]
  );

  const myUsername = activeConversation?.participants.find((participant) => participant.userId === meId)?.user.gameProfile?.username ?? "Someone";
  const { typingUsers, announceTyping, announceStopped } = useTypingIndicator({
    conversationId: activeId,
    userId: meId,
    username: myUsername,
    enabled: !!activeId && open,
  });
  const typingLabel = typingUsers.length === 1
    ? `@${typingUsers[0]} is typing...`
    : typingUsers.length > 1
      ? `${typingUsers.slice(0, 2).map((name) => `@${name}`).join(", ")} are typing...`
      : "";

  if (!enabled || pathname?.startsWith("/messages/")) return null;

  async function sendMessage() {
    const text = draft.trim();
    if (!activeId || !text || sending) return;
    announceStopped();
    setDraft("");
    setSending(true);
    setChatError(null);
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
      } else {
        setDraft(text);
        setChatError("Message was not sent.");
      }
    } catch {
      setDraft(text);
      setChatError("Could not connect. Message was not sent.");
    } finally {
      setSending(false);
    }
  }

  function setSize(size: DockSize) {
    setDockSize(size);
    window.localStorage.setItem(SIZE_KEY, size);
  }

  function backToList() {
    announceStopped();
    setActiveId(null);
    setActiveConversation(null);
    setMessages([]);
    setDraft("");
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

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-0 top-1/2 z-50 -translate-y-1/2 rounded-l-lg border border-r-0 border-[var(--border)] bg-[var(--text)] px-2.5 py-4 text-xs font-semibold text-[var(--bg)] shadow-xl transition-transform hover:-translate-x-1"
        aria-label="Open messages"
      >
        <span className="block [writing-mode:vertical-rl]">Messages</span>
        {unreadCount > 0 && (
          <span className="absolute -left-2 -top-2 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <aside
      className={`fixed inset-x-3 bottom-3 top-auto z-50 flex max-h-[82vh] flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg)] shadow-2xl sm:inset-x-auto sm:right-3 sm:w-[420px] lg:bottom-4 lg:right-4 lg:top-20 lg:max-h-none ${WIDTH_BY_SIZE[dockSize]}`}
      aria-label="Message dock"
    >
      <header className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg)] px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--text)]">{activeId ? activeTitle : "Messages"}</p>
          <p className="text-[10px] text-[var(--muted)]">
            {activeId ? "Docked right-side chat" : unreadCount > 0 ? `${unreadCount} unread` : "No unread messages"}
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5">
          {activeId && (
            <button
              type="button"
              onClick={backToList}
              className="rounded-md px-2 py-1 text-xs font-medium text-[var(--muted)] hover:bg-[var(--s2)] hover:text-[var(--text)]"
            >
              Back
            </button>
          )}
          <Link href="/messages" className="rounded-md px-2 py-1 text-xs font-medium text-[var(--ela)] hover:bg-[var(--s2)]">
            Full
          </Link>
          <button
            type="button"
            onClick={() => {
              announceStopped();
              setOpen(false);
            }}
            className="rounded-md px-2 py-1 text-xs font-medium text-[var(--muted)] hover:bg-[var(--s2)] hover:text-[var(--text)]"
            aria-label="Minimize messages"
          >
            Min
          </button>
        </div>
      </header>

      <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--s2)]/50 px-4 py-2">
        <p className="text-[10px] font-semibold uppercase text-[var(--muted)]">Panel size</p>
        <div className="grid grid-cols-3 overflow-hidden rounded-md border border-[var(--border)]">
          {(["compact", "standard", "wide"] as const).map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setSize(size)}
              className={`px-2.5 py-1 text-[10px] font-medium capitalize ${
                dockSize === size ? "bg-[var(--ela)] text-[var(--bg)]" : "text-[var(--muted)] hover:bg-[var(--s2)]"
              }`}
            >
              {size === "standard" ? "Med" : size}
            </button>
          ))}
        </div>
      </div>

      {activeId ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {messagesLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--ela)]" />
              </div>
            ) : chatError && messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <p className="text-xs text-red-400">{chatError}</p>
                <button
                  type="button"
                  onClick={() => activeId && loadConversation(activeId)}
                  className="rounded-md border border-[var(--border)] px-3 py-1 text-xs text-[var(--text)] hover:bg-[var(--s2)]"
                >
                  Retry
                </button>
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
                        className={`max-w-[84%] break-words rounded-2xl px-3 py-2 text-sm leading-relaxed ${
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

          <div className="flex-shrink-0 border-t border-[var(--border)] p-3">
            {chatError && messages.length > 0 && (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1">
                <p className="text-[10px] text-red-300">{chatError}</p>
                <button
                  type="button"
                  onClick={() => activeId && loadConversation(activeId)}
                  className="text-[10px] font-semibold text-red-200 hover:text-white"
                >
                  Retry
                </button>
              </div>
            )}
            {typingLabel && <p className="mb-1 px-1 text-[10px] text-[var(--ela)]">{typingLabel}</p>}
            <div className="flex items-end gap-2 rounded-xl border border-[var(--border)] bg-[var(--s2)] p-2">
              <textarea
                rows={1}
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  event.target.style.height = "auto";
                  event.target.style.height = `${Math.min(event.target.scrollHeight, 120)}px`;
                  if (event.target.value.trim()) announceTyping();
                  else announceStopped();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Message..."
                className="max-h-[120px] min-h-8 flex-1 resize-none bg-transparent px-1 py-1 text-sm leading-relaxed text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!draft.trim() || sending}
                className="h-8 flex-shrink-0 rounded-lg px-3 text-xs font-semibold text-[var(--bg)] disabled:opacity-40"
                style={{ background: "var(--ela)" }}
              >
                Send
              </button>
            </div>
            <p className="mt-1 px-1 text-[10px] text-[var(--muted)]">Enter sends. Shift+Enter adds a line.</p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {loading && conversations.length === 0 ? (
            <p className="px-3 py-4 text-xs text-[var(--muted)]">Loading messages...</p>
          ) : listError ? (
            <div className="px-3 py-8 text-center">
              <p className="text-xs text-red-400">{listError}</p>
              <button
                type="button"
                onClick={loadMessages}
                className="mt-2 rounded-md border border-[var(--border)] px-3 py-1 text-xs text-[var(--text)] hover:bg-[var(--s2)]"
              >
                Retry
              </button>
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-3 py-8 text-center">
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
              {conversations.slice(0, 10).map((conversation) => (
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
  );
}
