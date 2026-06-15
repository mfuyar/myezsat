"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import SocialNavLink from "@/components/notifications/SocialNavLink";

interface Conversation {
  id: string; type: string; name: string;
  participants: { userId: string; username: string }[];
  lastMessage: { content: string; createdAt: string } | null;
  unread: boolean; unreadCount: number; updatedAt: string;
}

interface GroupInvite {
  id: string;
  name: string;
  participants: { userId: string; username: string }[];
  createdAt: string;
}

interface Friend { id: string; name: string | null; gameProfile: { username: string; level: number; weeklyXP: number } | null }

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groupInvites, setGroupInvites] = useState<GroupInvite[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newType, setNewType] = useState<"dm" | "group">("dm");
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [msgRes, friendRes] = await Promise.all([fetch("/api/messages"), fetch("/api/friends")]);
    if (msgRes.ok) {
      const data = await msgRes.json();
      setConversations(data.conversations ?? []);
      setGroupInvites(data.pendingGroupInvites ?? []);
    }
    if (friendRes.ok) setFriends((await friendRes.json()).friends ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function startConversation() {
    if (selected.length === 0) return;
    setCreating(true);
    setCreateResult(null);
    const res = await fetch("/api/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: newType, name: groupName || undefined, participantIds: selected }),
    });
    const d = await res.json();
    setCreating(false);
    if (res.ok || res.status === 200) {
      setShowNew(false);
      setSelected([]);
      setGroupName("");
      if (newType === "group") {
        setCreateResult("Group created. Invites were sent for the others to accept.");
        load();
      } else {
        window.location.href = `/messages/${d.conversation.id}`;
      }
    } else {
      setCreateResult(d.error ?? "Could not start conversation.");
    }
  }

  async function respondGroupInvite(id: string, action: "accept" | "decline") {
    const res = await fetch(`/api/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok && action === "accept") window.location.href = `/messages/${id}`;
    else load();
  }

  function toggleFriend(id: string) {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <nav className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-serif italic text-xl text-[var(--text)]">myezsat</Link>
        <div className="flex items-center gap-4">
          <SocialNavLink href="/friends" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">
            Friends
          </SocialNavLink>
          <Link href="/dashboard" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">← Dashboard</Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[var(--text)]">Messages</h1>
          <Button variant="math" size="sm" onClick={() => setShowNew(true)}>+ New Message</Button>
        </div>

        {/* New conversation form */}
        {showNew && (
          <div className="card p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--text)]">New Conversation</p>
              <button onClick={() => { setShowNew(false); setSelected([]); }} className="text-[var(--muted)] hover:text-[var(--text)]">✕</button>
            </div>
            <div className="flex gap-2">
              {(["dm", "group"] as const).map((t) => (
                <button key={t} onClick={() => { setNewType(t); setSelected([]); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${newType === t ? "bg-[var(--ela)] border-transparent text-[var(--bg)]" : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"}`}>
                  {t === "dm" ? "Direct Message" : "Group Chat"}
                </button>
              ))}
            </div>
            {newType === "group" && (
              <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name…"
                className="w-full bg-[var(--s2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none" />
            )}
            <div>
              <p className="text-xs text-[var(--muted)] mb-2">Select {newType === "dm" ? "a friend" : "friends"}</p>
              {friends.length === 0 ? (
                <p className="text-xs text-[var(--muted)]">No friends yet. <Link href="/friends" className="text-[var(--ela)] underline">Add friends</Link> first.</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                  {friends.map((f) => {
                    const isSelected = selected.includes(f.id);
                    const canSelect = newType === "group" || selected.length === 0 || isSelected;
                    return (
                      <button key={f.id} onClick={() => canSelect && toggleFriend(f.id)} disabled={!canSelect && !isSelected}
                        className={`flex items-center gap-3 p-2.5 rounded-lg text-left transition-all ${isSelected ? "bg-[var(--ela-bg)] border border-[var(--ela)]" : "bg-[var(--s2)] border border-[var(--border)] disabled:opacity-40"}`}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ background: "var(--ela)", color: "var(--bg)" }}>
                          {(f.gameProfile?.username ?? f.name ?? "?")[0].toUpperCase()}
                        </div>
                        <span className="text-sm text-[var(--text)]">@{f.gameProfile?.username ?? f.name}</span>
                        {isSelected && <span className="ml-auto text-[var(--ela)]">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setShowNew(false); setSelected([]); }}>Cancel</Button>
              <Button variant="ela" size="sm" loading={creating} disabled={selected.length === 0} onClick={startConversation}>
                {newType === "group" ? "Send Invites" : "Start Chat"}
              </Button>
            </div>
          </div>
        )}
        {createResult && (
          <p className={`text-xs ${createResult.includes("created") ? "text-green-400" : "text-red-400"}`}>
            {createResult}
          </p>
        )}

        {groupInvites.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest mb-2">
              Group Invites ({groupInvites.length})
            </p>
            <div className="flex flex-col gap-2">
              {groupInvites.map((invite) => (
                <div key={invite.id} className="card p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-[var(--bg)]"
                    style={{ background: "var(--math)" }}>
                    G
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text)]">{invite.name}</p>
                    <p className="text-[10px] text-[var(--muted)]">
                      {invite.participants.length} invited members
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => respondGroupInvite(invite.id, "accept")}
                      className="px-3 py-1 rounded-lg text-xs font-semibold text-[var(--bg)] transition-all"
                      style={{ background: "var(--math)" }}>Accept</button>
                    <button onClick={() => respondGroupInvite(invite.id, "decline")}
                      className="px-3 py-1 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition-all">
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-[var(--border)] border-t-[var(--ela)] rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-3xl mb-2">💬</p>
            <p className="text-sm font-medium text-[var(--text)]">No messages yet</p>
            <p className="text-xs text-[var(--muted)] mt-1">Start a conversation with a friend</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {conversations.map((c) => (
              <Link key={c.id} href={`/messages/${c.id}`}
                className={`card p-4 flex items-center gap-3 hover:bg-[var(--s2)] transition-colors ${c.unread ? "border-[var(--ela)]" : ""}`}>
                <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold"
                  style={{ background: c.type === "group" ? "var(--math)" : "var(--ela)", color: "var(--bg)" }}>
                  {c.type === "group" ? "G" : c.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium truncate ${c.unread ? "text-[var(--text)]" : "text-[var(--muted)]"}`}>
                      {c.name}
                      {c.type === "group" && <span className="text-[10px] text-[var(--muted)] ml-1">· {c.participants.length} members</span>}
                    </p>
                    {c.lastMessage && (
                      <span className="text-[10px] text-[var(--muted)] flex-shrink-0">
                        {new Date(c.lastMessage.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${c.unread ? "text-[var(--text)] font-medium" : "text-[var(--muted)]"}`}>
                    {c.lastMessage?.content ?? "No messages yet"}
                  </p>
                </div>
                {(c.unreadCount ?? 0) > 0 && (
                  <span className="min-w-5 flex-shrink-0 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
                    {c.unreadCount > 99 ? "99+" : c.unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
