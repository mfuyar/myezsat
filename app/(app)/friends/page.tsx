"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";

interface Friend { connectionId: string; id: string; name: string | null; gameProfile: { username: string; level: number; weeklyXP: number } | null }
interface Pending { id: string; requester?: { id: string; name: string | null; gameProfile: { username: string; level: number } | null }; receiver?: { id: string; name: string | null; gameProfile: { username: string; level: number } | null } }
interface Me { username: string; level: number }

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingReceived, setPendingReceived] = useState<Pending[]>([]);
  const [pendingSent, setPendingSent] = useState<Pending[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameResult, setUsernameResult] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/friends");
    if (res.ok) {
      const d = await res.json();
      setMe(d.me ?? null);
      setUsernameDraft(d.me?.username ?? "");
      setFriends(d.friends ?? []);
      setPendingReceived(d.pendingReceived ?? []);
      setPendingSent(d.pendingSent ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function sendRequest() {
    if (!search.trim()) return;
    setSending(true);
    setSearchResult(null);
    const res = await fetch("/api/friends", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: search.trim() }),
    });
    const d = await res.json();
    setSending(false);
    if (res.ok) { setSearchResult("Request sent!"); setSearch(""); load(); }
    else setSearchResult(d.error ?? "Error sending request");
  }

  async function saveUsername() {
    const username = usernameDraft.trim().toLowerCase();
    setUsernameResult(null);
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      setUsernameResult("Use 3-20 lowercase letters, numbers, or underscores.");
      return;
    }

    setUsernameSaving(true);
    const res = await fetch("/api/game/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const data = await res.json().catch(() => ({}));
    setUsernameSaving(false);

    if (!res.ok) {
      setUsernameResult(data.error ?? "Username is not available.");
      return;
    }

    setMe(data.profile);
    setUsernameDraft(data.profile.username);
    setEditingUsername(false);
    setUsernameResult("Username updated.");
  }

  async function respondRequest(connectionId: string, action: "accept" | "decline") {
    await fetch(`/api/friends/${action}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionId }),
    });
    load();
  }

  async function removeFriend(connectionId: string) {
    await fetch("/api/friends/remove", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionId }),
    });
    load();
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <nav className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
        <span className="font-serif italic text-xl text-[var(--text)]">myezsat</span>
        <div className="flex items-center gap-4">
          <Link href="/leaderboard" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">Leaderboard</Link>
          <Link href="/challenges"  className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">Challenges</Link>
          <Link href="/dashboard"   className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">← Dashboard</Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-[var(--text)]">Friends</h1>

        {/* Search / Add */}
        <div className="card p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest">Add a Friend</p>
          <div className="flex gap-2">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username or email"
              onKeyDown={(e) => e.key === "Enter" && sendRequest()}
              className="flex-1 bg-[var(--s2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none" />
            <Button variant="math" size="sm" onClick={sendRequest} loading={sending}>Send</Button>
          </div>
          {searchResult && <p className={`text-xs ${searchResult.includes("sent") ? "text-green-400" : "text-red-400"}`}>{searchResult}</p>}
          {me && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--s2)] p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-[var(--muted)]">
                  Your username: <span className="font-mono text-[var(--text)]">@{me.username}</span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingUsername((value) => !value);
                    setUsernameResult(null);
                    setUsernameDraft(me.username);
                  }}
                  className="text-xs text-[var(--math)] hover:opacity-80"
                >
                  {editingUsername ? "Cancel" : "Edit"}
                </button>
              </div>
              {editingUsername && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={usernameDraft}
                    onChange={(e) => setUsernameDraft(e.target.value.toLowerCase())}
                    placeholder="unique_username"
                    className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none"
                  />
                  <Button variant="ela" size="sm" onClick={saveUsername} loading={usernameSaving}>Save</Button>
                </div>
              )}
              {usernameResult && (
                <p className={`text-xs ${usernameResult.includes("updated") ? "text-green-400" : "text-red-400"}`}>
                  {usernameResult}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Pending received */}
        {pendingReceived.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest mb-2">
              Friend Requests ({pendingReceived.length})
            </p>
            <div className="flex flex-col gap-2">
              {pendingReceived.map((p) => (
                <div key={p.id} className="card p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--s3)] flex items-center justify-center text-sm font-bold text-[var(--muted)]">
                    {(p.requester?.gameProfile?.username ?? "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--text)]">@{p.requester?.gameProfile?.username ?? p.requester?.name}</p>
                    <p className="text-[10px] text-[var(--muted)]">Level {p.requester?.gameProfile?.level ?? 1}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => respondRequest(p.id, "accept")}
                      className="px-3 py-1 rounded-lg text-xs font-semibold text-[var(--bg)] transition-all"
                      style={{ background: "var(--math)" }}>Accept</button>
                    <button onClick={() => respondRequest(p.id, "decline")}
                      className="px-3 py-1 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition-all">
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Friends list */}
        <section>
          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest mb-2">
            Friends ({friends.length})
          </p>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-[var(--border)] border-t-[var(--math)] rounded-full animate-spin" />
            </div>
          ) : friends.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-2xl mb-2">🤝</p>
              <p className="text-sm text-[var(--text)]">No friends yet — search by username above to connect!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {friends.map((f) => (
                <div key={f.connectionId} className="card p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--s3)] flex items-center justify-center text-sm font-bold"
                    style={{ color: "var(--ela)" }}>
                    {(f.gameProfile?.username ?? f.name ?? "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text)]">@{f.gameProfile?.username ?? f.name}</p>
                    <p className="text-[10px] text-[var(--muted)]">
                      Level {f.gameProfile?.level ?? 1} · {f.gameProfile?.weeklyXP ?? 0} XP this week
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/challenges?challenge=${f.gameProfile?.username}`}
                      className="px-3 py-1 rounded-lg text-xs font-semibold border transition-all"
                      style={{ borderColor: "var(--math)", color: "var(--math)" }}>
                      Challenge
                    </Link>
                    <button onClick={() => removeFriend(f.connectionId)}
                      className="px-2 py-1 rounded-lg text-xs text-[var(--muted)] hover:text-red-400 transition-colors">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pending sent */}
        {pendingSent.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest mb-2">Sent Requests</p>
            <div className="flex flex-col gap-2">
              {pendingSent.map((p) => (
                <div key={p.id} className="card p-3 flex items-center gap-3 opacity-60">
                  <div className="flex-1">
                    <p className="text-sm text-[var(--text)]">@{p.receiver?.gameProfile?.username ?? p.receiver?.name}</p>
                    <p className="text-[10px] text-[var(--muted)]">Pending…</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
