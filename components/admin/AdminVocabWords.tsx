"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

type VocabWord = {
  id: string;
  word: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  difficulty: "easy" | "medium" | "hard";
  category: string | null;
  active: boolean;
};

type FormState = Omit<VocabWord, "id">;

const EMPTY_FORM: FormState = {
  word: "",
  partOfSpeech: "noun",
  definition: "",
  example: "",
  difficulty: "medium",
  category: "",
  active: true,
};

export default function AdminVocabWords() {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [total, setTotal] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<VocabWord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (q) params.set("q", q);
    const res = await fetch(`/api/admin/vocab?${params}`);
    const data = await res.json();
    setWords(data.words ?? []);
    setTotal(data.total ?? 0);
    setActiveCount(data.activeCount ?? 0);
    setSubscriberCount(data.subscriberCount ?? 0);
    setPages(data.pages ?? 1);
    setLoading(false);
  }, [page, q]);

  useEffect(() => { load(); }, [load]);

  async function testSend(dryRun = false) {
    setSending(true);
    setNotice(null);
    const res = await fetch("/api/admin/vocab/test-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail || undefined, dryRun }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    setNotice(res.ok ? `${dryRun ? "Rendered" : "Sent"}: ${data.subject ?? "test vocabulary email"}` : JSON.stringify(data.error ?? "Test send failed"));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { label: "Total words", value: total },
          { label: "Active words", value: activeCount },
          { label: "Subscribers", value: subscriberCount },
        ].map((item) => (
          <div key={item.label} className="card p-4">
            <p className="text-xs uppercase tracking-widest text-[var(--muted)] font-semibold">{item.label}</p>
            <p className="text-2xl font-mono font-bold text-[var(--text)] mt-1">{item.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="card p-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Search words"
            className="min-w-0 flex-1 bg-[var(--s2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none"
          />
          <Button type="button" variant="math" size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>Add Word</Button>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="Optional test email"
            className="min-w-0 flex-1 bg-[var(--s2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none"
          />
          <Button type="button" variant="ghost" size="sm" loading={sending} onClick={() => testSend(true)}>Dry Run</Button>
          <Button type="button" variant="ela" size="sm" loading={sending} onClick={() => testSend(false)}>Send Test</Button>
        </div>
        {notice ? <p className="text-xs text-[var(--muted)]">{notice}</p> : null}
      </div>

      {showForm ? (
        <WordForm
          word={editing}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
        />
      ) : null}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-[var(--border)] border-t-[var(--math)] rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {["Word", "Difficulty", "Definition", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-[10px] text-[var(--muted)] font-medium uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {words.map((word, i) => (
                <tr key={word.id} className={i < words.length - 1 ? "border-b border-[var(--border)]" : ""}>
                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-[var(--text)]">{word.word}</p>
                    <p className="text-xs text-[var(--muted)]">{word.partOfSpeech}{word.category ? ` · ${word.category}` : ""}</p>
                  </td>
                  <td className="px-3 py-2.5"><Badge variant="muted">{word.difficulty}</Badge></td>
                  <td className="px-3 py-2.5 text-xs text-[var(--muted)] max-w-sm truncate">{word.definition}</td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: word.active ? "var(--green)" : "var(--muted)" }}>{word.active ? "Active" : "Paused"}</td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => { setEditing(word); setShowForm(true); }}
                      className="text-xs text-[var(--math)] hover:opacity-80"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--muted)] disabled:opacity-40 hover:text-[var(--text)] transition-colors">
            Prev
          </button>
          <span className="text-xs text-[var(--muted)]">{page} / {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
            className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--muted)] disabled:opacity-40 hover:text-[var(--text)] transition-colors">
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}

function WordForm({ word, onCancel, onSaved }: { word: VocabWord | null; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<FormState>(word ?? EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch(word ? `/api/admin/vocab/${word.id}` : "/api/admin/vocab", {
      method: word ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, category: form.category || null }),
    });

    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(JSON.stringify(data.error ?? "Save failed"));
      return;
    }

    onSaved();
  }

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <form onSubmit={submit} className="card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text)]">{word ? "Edit Word" : "Add Word"}</h3>
        <button type="button" onClick={onCancel} className="text-[var(--muted)] hover:text-[var(--text)]">Close</button>
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        <Field label="Word" value={form.word} onChange={(value) => update("word", value)} />
        <Field label="Part of speech" value={form.partOfSpeech} onChange={(value) => update("partOfSpeech", value)} />
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--muted)] font-semibold">Difficulty</span>
          <select value={form.difficulty} onChange={(e) => update("difficulty", e.target.value as FormState["difficulty"])}
            className="bg-[var(--s2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none">
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <Field label="Category" value={form.category ?? ""} onChange={(value) => update("category", value)} />
      </div>

      <Field label="Definition" value={form.definition} onChange={(value) => update("definition", value)} multiline />
      <Field label="Example" value={form.example} onChange={(value) => update("example", value)} multiline />

      <label className="flex items-center gap-2 text-sm text-[var(--text)]">
        <input type="checkbox" checked={form.active} onChange={(e) => update("active", e.target.checked)} />
        Active in daily emails
      </label>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="math" size="sm" loading={saving}>Save Word</Button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-[var(--muted)] font-semibold">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="bg-[var(--s2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none resize-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-[var(--s2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none"
        />
      )}
    </label>
  );
}
