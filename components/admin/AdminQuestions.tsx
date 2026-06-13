"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

interface Q {
  id: string; subject: string; topicId: string; difficulty: string;
  questionNum: number; sourceFile: string; question: string;
  correctAnswer: string; hasImage: boolean;
}

const TOPICS_ELA = ["rhetoric", "reading-comprehension", "punctuation", "vocabulary", "grammar"];
const TOPICS_MATH = ["algebra", "advanced-math", "problem-solving", "geometry", "statistics"];

export default function AdminQuestions() {
  const [questions, setQuestions] = useState<Q[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filterTopic, setFilterTopic] = useState("");
  const [filterDiff, setFilterDiff] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (filterTopic) params.set("topicId", filterTopic);
    if (filterDiff)  params.set("difficulty", filterDiff);
    const res = await fetch(`/api/admin/questions?${params}`);
    const data = await res.json();
    setQuestions(data.questions ?? []);
    setTotal(data.total ?? 0);
    setPages(data.pages ?? 1);
    setLoading(false);
  }, [page, filterTopic, filterDiff]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col gap-4">
      {/* Filters + Add */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={filterTopic} onChange={(e) => { setFilterTopic(e.target.value); setPage(1); }}
          className="bg-[var(--s2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none">
          <option value="">All topics</option>
          {[...TOPICS_ELA, ...TOPICS_MATH].map((t) => (
            <option key={t} value={t}>{t.replace(/-/g, " ")}</option>
          ))}
        </select>
        <select value={filterDiff} onChange={(e) => { setFilterDiff(e.target.value); setPage(1); }}
          className="bg-[var(--s2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none">
          <option value="">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <span className="text-xs text-[var(--muted)] ml-auto">{total.toLocaleString()} questions</span>
        <Button variant="math" size="sm" onClick={() => setShowAdd(true)}>+ Add Question</Button>
      </div>

      {/* Add Question Form */}
      {showAdd && <AddQuestionForm onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}

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
                {["#", "Subject", "Topic", "Difficulty", "Question", "Answer"].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-[10px] text-[var(--muted)] font-medium uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {questions.map((q, i) => (
                <tr key={q.id} className={i < questions.length - 1 ? "border-b border-[var(--border)]" : ""}>
                  <td className="px-3 py-2.5 font-mono text-xs text-[var(--muted)]">{q.questionNum}</td>
                  <td className="px-3 py-2.5"><Badge variant={q.subject as "math" | "ela"}>{q.subject === "math" ? "Math" : "R&W"}</Badge></td>
                  <td className="px-3 py-2.5 text-xs text-[var(--muted)] capitalize">{q.topicId.replace(/-/g, " ")}</td>
                  <td className="px-3 py-2.5"><Badge variant="muted">{q.difficulty}</Badge></td>
                  <td className="px-3 py-2.5 max-w-xs text-xs text-[var(--text)] truncate">{q.question}</td>
                  <td className="px-3 py-2.5 font-mono text-xs font-bold" style={{ color: "var(--math)" }}>{q.correctAnswer}</td>
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
            className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--muted)] disabled:opacity-40 hover:text-[var(--text)] transition-colors">
            ←
          </button>
          <span className="text-xs text-[var(--muted)]">{page} / {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
            className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--muted)] disabled:opacity-40 hover:text-[var(--text)] transition-colors">
            →
          </button>
        </div>
      )}
    </div>
  );
}

function AddQuestionForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ subject: "ela", topicId: "rhetoric", difficulty: "medium", question: "", choiceA: "", choiceB: "", choiceC: "", choiceD: "", correctAnswer: "A", explanation: "", passage: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, choiceD: form.choiceD || undefined, passage: form.passage || undefined }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(JSON.stringify(data.error)); return; }
    onSaved();
  }

  const field = (key: keyof typeof form, label: string, multiline = false) => (
    <div>
      <label className="text-xs text-[var(--muted)] font-semibold block mb-1">{label}</label>
      {multiline ? (
        <textarea value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} rows={3}
          className="w-full bg-[var(--s2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none resize-none" />
      ) : (
        <input type="text" value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          className="w-full bg-[var(--s2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none" />
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text)]">Add Custom Question</h3>
        <button type="button" onClick={onClose} className="text-[var(--muted)] hover:text-[var(--text)]">✕</button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-[var(--muted)] font-semibold block mb-1">Subject</label>
          <select value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            className="w-full bg-[var(--s2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none">
            <option value="ela">Reading &amp; Writing</option>
            <option value="math">Math</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--muted)] font-semibold block mb-1">Topic</label>
          <select value={form.topicId} onChange={(e) => setForm((f) => ({ ...f, topicId: e.target.value }))}
            className="w-full bg-[var(--s2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none">
            {(form.subject === "ela" ? ["rhetoric","reading-comprehension","punctuation","vocabulary","grammar"] : ["algebra","advanced-math","problem-solving","geometry","statistics"]).map((t) => (
              <option key={t} value={t}>{t.replace(/-/g, " ")}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--muted)] font-semibold block mb-1">Difficulty</label>
          <select value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
            className="w-full bg-[var(--s2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none">
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>
      {field("passage", "Passage (optional)", true)}
      {field("question", "Question *", true)}
      <div className="grid grid-cols-2 gap-3">
        {field("choiceA", "Choice A *")}
        {field("choiceB", "Choice B *")}
        {field("choiceC", "Choice C *")}
        {field("choiceD", "Choice D (optional)")}
      </div>
      <div>
        <label className="text-xs text-[var(--muted)] font-semibold block mb-1">Correct Answer</label>
        <div className="flex gap-2">
          {["A","B","C","D"].map((k) => (
            <button key={k} type="button" onClick={() => setForm((f) => ({ ...f, correctAnswer: k }))}
              className={`w-10 h-10 rounded-lg font-mono font-bold border transition-all ${form.correctAnswer === k ? "bg-[var(--math)] border-transparent text-[var(--bg)]" : "border-[var(--border)] text-[var(--muted)]"}`}>
              {k}
            </button>
          ))}
        </div>
      </div>
      {field("explanation", "Explanation *", true)}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="math" size="sm" loading={saving}>Save Question</Button>
      </div>
    </form>
  );
}
