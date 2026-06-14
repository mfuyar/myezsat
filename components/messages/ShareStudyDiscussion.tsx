"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { createStudyDiscussionMessage, type StudyDiscussionPayload } from "@/lib/messages/study-discussion";

type Conversation = {
  id: string;
  type: string;
  name: string;
  unread?: boolean;
};

type Friend = {
  id: string;
  name: string | null;
  gameProfile: { username: string; level: number; weeklyXP?: number } | null;
};

type ShareStudyDiscussionProps = {
  payload: StudyDiscussionPayload;
  buttonLabel?: string;
  buttonVariant?: "ghost" | "math" | "ela";
};

export default function ShareStudyDiscussion({
  payload,
  buttonLabel = "Discuss",
  buttonVariant = "ghost",
}: ShareStudyDiscussionProps) {
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [selectedFriendId, setSelectedFriendId] = useState("");
  const [mode, setMode] = useState<"chat" | "friend">("chat");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const discussionTitle = useMemo(() => {
    if (payload.kind === "topic") return payload.topicLabel;
    return payload.question.length > 72 ? `${payload.question.slice(0, 69)}...` : payload.question;
  }, [payload]);

  const loadTargets = useCallback(async () => {
    setLoading(true);
    setResult(null);
    try {
      const [messageRes, friendRes] = await Promise.all([
        fetch("/api/messages", { cache: "no-store" }),
        fetch("/api/friends", { cache: "no-store" }),
      ]);

      if (messageRes.ok) {
        const data = await messageRes.json();
        const accepted = (data.conversations ?? []) as Conversation[];
        setConversations(accepted);
        setSelectedConversationId((current) => current || accepted[0]?.id || "");
      }

      if (friendRes.ok) {
        const data = await friendRes.json();
        const acceptedFriends = (data.friends ?? []) as Friend[];
        setFriends(acceptedFriends);
        setSelectedFriendId((current) => current || acceptedFriends[0]?.id || "");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadTargets();
  }, [open, loadTargets]);

  async function resolveConversationId() {
    if (mode === "chat") return selectedConversationId;
    if (!selectedFriendId) return "";

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "dm", participantIds: [selectedFriendId] }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok && res.status !== 200) throw new Error(data.error ?? "Could not start chat.");
    return data.conversation?.id ?? "";
  }

  async function sendDiscussion() {
    setSending(true);
    setResult(null);
    try {
      const conversationId = await resolveConversationId();
      if (!conversationId) throw new Error("Choose a chat or friend first.");

      const content = createStudyDiscussionMessage({ ...payload, note: note.trim() || undefined });
      const res = await fetch(`/api/messages/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not send discussion.");

      setResult("Discussion sent.");
      setNote("");
      window.setTimeout(() => setOpen(false), 700);
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Could not send discussion.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button type="button" variant={buttonVariant} size="sm" onClick={() => setOpen(true)}>
        {buttonLabel}
      </Button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 px-3 py-4 sm:items-center">
          <div className="w-full max-w-md overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg)] shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text)]">Start a study discussion</p>
                <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{discussionTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-sm text-[var(--muted)] hover:bg-[var(--s2)] hover:text-[var(--text)]"
              >
                x
              </button>
            </div>

            <div className="flex flex-col gap-4 px-4 py-4">
              <div className="grid grid-cols-2 overflow-hidden rounded-md border border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setMode("chat")}
                  className={`px-3 py-2 text-xs font-semibold ${
                    mode === "chat" ? "bg-[var(--ela)] text-[var(--bg)]" : "text-[var(--muted)] hover:bg-[var(--s2)]"
                  }`}
                >
                  Existing chat
                </button>
                <button
                  type="button"
                  onClick={() => setMode("friend")}
                  className={`px-3 py-2 text-xs font-semibold ${
                    mode === "friend" ? "bg-[var(--ela)] text-[var(--bg)]" : "text-[var(--muted)] hover:bg-[var(--s2)]"
                  }`}
                >
                  Friend
                </button>
              </div>

              {loading ? (
                <p className="rounded-lg border border-[var(--border)] px-3 py-3 text-xs text-[var(--muted)]">
                  Loading chats...
                </p>
              ) : mode === "chat" ? (
                <select
                  value={selectedConversationId}
                  onChange={(event) => setSelectedConversationId(event.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--s2)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none"
                >
                  {conversations.length === 0 ? (
                    <option value="">No chats yet</option>
                  ) : (
                    conversations.map((conversation) => (
                      <option key={conversation.id} value={conversation.id}>
                        {conversation.type === "group" ? "Group: " : "Chat: "}
                        {conversation.name}
                      </option>
                    ))
                  )}
                </select>
              ) : (
                <select
                  value={selectedFriendId}
                  onChange={(event) => setSelectedFriendId(event.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--s2)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none"
                >
                  {friends.length === 0 ? (
                    <option value="">No friends yet</option>
                  ) : (
                    friends.map((friend) => (
                      <option key={friend.id} value={friend.id}>
                        @{friend.gameProfile?.username ?? friend.name ?? "friend"}
                      </option>
                    ))
                  )}
                </select>
              )}

              <textarea
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={240}
                placeholder="Add what confused you..."
                className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--s2)] px-3 py-2 text-sm leading-relaxed text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none"
              />

              {result && (
                <p className={`text-xs ${result.includes("sent") ? "text-green-400" : "text-red-400"}`}>{result}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant={payload.subject === "math" ? "math" : "ela"}
                size="sm"
                loading={sending}
                disabled={(mode === "chat" && !selectedConversationId) || (mode === "friend" && !selectedFriendId)}
                onClick={sendDiscussion}
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
