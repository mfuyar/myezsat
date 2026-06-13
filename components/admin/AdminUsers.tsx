"use client";

import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface AdminUser {
  id: string; email: string; name: string | null; role: string;
  suspended: boolean; suspendedAt: string | null; suspendReason: string | null;
  createdAt: string; deletedAt: string | null;
  gameProfile: { username: string; level: number; totalXP: number } | null;
  _count: { practiceSessions: number };
}

const ROLES = ["student","parent","tutor","admin"];

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ user: AdminUser; action: string } | null>(null);
  const [reason, setReason] = useState("");
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page) });
    if (search) p.set("q", search);
    const res = await fetch(`/api/admin/users?${p}`);
    const d = await res.json();
    setUsers(d.users ?? []);
    setTotal(d.total ?? 0);
    setPages(d.pages ?? 1);
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  async function doAction() {
    if (!modal) return;
    setActing(true);
    const body: Record<string, string> = { action: modal.action };
    if (reason) body.reason = reason;
    if (modal.action === "set_role") body.role = reason; // reuse reason field for role value
    await fetch(`/api/admin/users/${modal.user.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setActing(false);
    setModal(null);
    setReason("");
    load();
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="flex gap-3 items-center">
        <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }}
          placeholder="Search by email, name, or username…"
          className="flex-1 bg-[var(--s2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none" />
        <Button variant="ghost" size="sm" onClick={() => { setSearch(searchInput); setPage(1); }}>Search</Button>
        {search && <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}>Clear</Button>}
        <span className="text-xs text-[var(--muted)]">{total} users</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-[var(--border)] border-t-[var(--math)] rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {["User", "Role", "Status", "XP", "Sessions", "Joined", "Actions"].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-[10px] text-[var(--muted)] font-medium uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className={`${i < users.length - 1 ? "border-b border-[var(--border)]" : ""} ${u.deletedAt ? "opacity-40" : ""}`}>
                  <td className="px-3 py-2.5">
                    <p className="text-xs font-medium text-[var(--text)]">{u.name ?? u.email}</p>
                    <p className="text-[10px] text-[var(--muted)]">@{u.gameProfile?.username ?? "—"} · {u.email}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant="muted">{u.role}</Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    {u.deletedAt ? (
                      <span className="text-[10px] text-red-400 font-semibold">Deleted</span>
                    ) : u.suspended ? (
                      <span className="text-[10px] text-orange-400 font-semibold">Suspended</span>
                    ) : (
                      <span className="text-[10px] text-green-400">Active</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs" style={{ color: "var(--math)" }}>{u.gameProfile?.totalXP ?? 0}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-[var(--muted)]">{u._count.practiceSessions}</td>
                  <td className="px-3 py-2.5 text-[10px] text-[var(--muted)]">
                    {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1 flex-wrap">
                      {!u.deletedAt && !u.suspended && (
                        <button onClick={() => { setModal({ user: u, action: "suspend" }); setReason(""); }}
                          className="text-[10px] px-2 py-1 rounded border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 transition-colors">
                          Suspend
                        </button>
                      )}
                      {u.suspended && !u.deletedAt && (
                        <button onClick={() => setModal({ user: u, action: "unsuspend" })}
                          className="text-[10px] px-2 py-1 rounded border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors">
                          Unsuspend
                        </button>
                      )}
                      {!u.deletedAt && (
                        <button onClick={() => { setModal({ user: u, action: "delete" }); setReason(""); }}
                          className="text-[10px] px-2 py-1 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">
                          Delete
                        </button>
                      )}
                      {u.deletedAt && (
                        <button onClick={() => setModal({ user: u, action: "restore" })}
                          className="text-[10px] px-2 py-1 rounded border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition-colors">
                          Restore
                        </button>
                      )}
                      <select defaultValue={u.role}
                        onChange={(e) => { setModal({ user: u, action: "set_role" }); setReason(e.target.value); }}
                        className="text-[10px] px-1 py-1 rounded border border-[var(--border)] bg-[var(--s2)] text-[var(--muted)] focus:outline-none">
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--muted)] disabled:opacity-40 hover:text-[var(--text)]">←</button>
          <span className="text-xs text-[var(--muted)]">{page} / {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
            className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--muted)] disabled:opacity-40 hover:text-[var(--text)]">→</button>
        </div>
      )}

      {/* Action modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-sm w-full flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-[var(--text)] capitalize">
              {modal.action.replace("_", " ")}: {modal.user.name ?? modal.user.email}
            </h3>
            {(modal.action === "suspend" || modal.action === "delete") && (
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                placeholder="Reason (required)…"
                className="w-full bg-[var(--s2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none resize-none" />
            )}
            {modal.action === "set_role" && (
              <p className="text-sm text-[var(--muted)]">Change role to: <strong className="text-[var(--text)]">{reason}</strong></p>
            )}
            {modal.action === "delete" && (
              <p className="text-xs text-red-400 border border-red-500/20 rounded-lg p-2">
                This is a soft delete — the account is hidden but data is preserved. Use "Restore" to undo.
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setModal(null); setReason(""); }}>Cancel</Button>
              <Button variant="danger" size="sm" loading={acting}
                disabled={(modal.action === "suspend" || modal.action === "delete") && !reason}
                onClick={doAction}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
