"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";

interface Msg {
  id: string; conversationId: string; senderId: string; content: string; createdAt: string;
  sender: { id: string; name: string | null; gameProfile: { username: string } | null };
}
interface Participant { userId: string; username: string }
interface Conversation { id: string; type: string; name: string | null; participants: Participant[] }

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const loadMessages = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setMeId(user?.id ?? null);

    const res = await fetch(`/api/messages/${id}`);
    if (res.ok) {
      const d = await res.json();
      setConversation(d.conversation);
      setMessages(d.messages);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`conv:${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ConversationMessage", filter: `conversationId=eq.${id}` },
        async (payload) => {
          // Fetch the full message with sender info
          const res = await fetch(`/api/messages/${id}?limit=1`);
          if (res.ok) {
            const d = await res.json();
            const newMsg = d.messages[d.messages.length - 1];
            if (newMsg && !messages.find((m) => m.id === newMsg.id)) {
              setMessages((prev) => [...prev, newMsg]);
            }
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          void payload;
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, messages]);

  const myUsername = conversation?.participants.find((p) => p.userId === meId)?.username ?? "Someone";
  const { typingUsers, announceTyping, announceStopped } = useTypingIndicator({
    conversationId: id,
    userId: meId,
    username: myUsername,
    enabled: !!conversation,
  });
  const typingLabel = typingUsers.length === 1
    ? `@${typingUsers[0]} is typing...`
    : typingUsers.length > 1
      ? `${typingUsers.slice(0, 2).map((name) => `@${name}`).join(", ")} are typing...`
      : "";

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;
    announceStopped();
    setInput("");
    setSending(true);

    const res = await fetch(`/api/messages/${id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    if (res.ok) {
      const d = await res.json();
      setMessages((prev) => {
        if (prev.find((m) => m.id === d.message.id)) return prev;
        return [...prev, d.message];
      });
    }
    setSending(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const chatName = conversation
    ? conversation.type === "group"
      ? conversation.name ?? "Group Chat"
      : conversation.participants.find((p) => p.userId !== meId)?.username ?? "Chat"
    : "…";

  function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay
      ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      : d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] lg:flex lg:justify-end">
      <section className="flex h-screen w-full flex-col bg-[var(--bg)] lg:max-w-xl lg:border-l lg:border-[var(--border)]">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] flex-shrink-0">
        <Link href="/messages" className="text-[var(--muted)] hover:text-[var(--text)] transition-colors text-sm">←</Link>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-[var(--bg)]"
          style={{ background: conversation?.type === "group" ? "var(--math)" : "var(--ela)" }}>
          {conversation?.type === "group" ? "G" : chatName[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text)] truncate">
            {conversation?.type === "group" ? chatName : `@${chatName}`}
          </p>
          {conversation?.type === "group" && (
            <p className="text-[10px] text-[var(--muted)]">{conversation.participants.length} members</p>
          )}
        </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[var(--border)] border-t-[var(--ela)] rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
            <p className="text-3xl">💬</p>
            <p className="text-sm text-[var(--muted)]">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.senderId === meId;
            const showSender = !isMe && (i === 0 || messages[i - 1].senderId !== msg.senderId);
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                {showSender && conversation?.type === "group" && (
                  <p className="text-[10px] text-[var(--muted)] mb-0.5 px-1">
                    @{msg.sender.gameProfile?.username ?? msg.sender.name}
                  </p>
                )}
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                  isMe
                    ? "rounded-tr-sm text-[var(--bg)]"
                    : "rounded-tl-sm bg-[var(--s2)] border border-[var(--border)] text-[var(--text)]"
                }`}
                  style={isMe ? { background: "var(--ela)" } : {}}>
                  {msg.content}
                </div>
                <p className="text-[9px] text-[var(--muted)] mt-0.5 px-1">{formatTime(msg.createdAt)}</p>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-[var(--border)]">
        {typingLabel && <p className="text-[10px] text-[var(--ela)] mb-1 px-1">{typingLabel}</p>}
        <div className="flex gap-2 items-end rounded-xl bg-[var(--s2)] border border-[var(--border)] p-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              if (e.target.value.trim()) announceTyping();
              else announceStopped();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--muted)] resize-none focus:outline-none py-1 px-1 leading-relaxed"
            style={{ minHeight: "32px", maxHeight: "120px" }}
          />
          <button onClick={() => { announceStopped(); sendMessage(); }} disabled={!input.trim() || sending}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-all"
            style={{ background: "var(--ela)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 13L7 1L13 13L7 10L1 13Z" fill="var(--bg)" stroke="var(--bg)" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-[var(--muted)] mt-1 px-1">Enter to send · Shift+Enter for new line</p>
        </div>
      </section>
    </div>
  );
}
