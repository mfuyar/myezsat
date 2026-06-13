"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

const TEST_TYPES = [
  { value: "sat",        label: "SAT",           range: "200–800 per section" },
  { value: "psat_nmsqt", label: "PSAT/NMSQT",    range: "160–760 per section" },
  { value: "psat10",     label: "PSAT 10",        range: "160–760 per section" },
  { value: "psat89",     label: "PSAT 8/9",       range: "120–720 per section" },
  { value: "practice",   label: "Practice Test",  range: "200–800 per section" },
];

const SECTION_RANGES: Record<string, [number, number]> = {
  sat:        [200, 800],
  practice:   [200, 800],
  psat_nmsqt: [160, 760],
  psat10:     [160, 760],
  psat89:     [120, 720],
};

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export default function ScoreEntryModal({ onClose, onSaved }: Props) {
  const today = new Date().toISOString().split("T")[0];

  const [testType, setTestType] = useState("sat");
  const [testName, setTestName] = useState("");
  const [testDate, setTestDate] = useState(today);
  const [mathScore, setMathScore] = useState("");
  const [rwScore, setRwScore] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sectionMin, sectionMax] = SECTION_RANGES[testType];
  const math = parseInt(mathScore) || 0;
  const rw = parseInt(rwScore) || 0;
  const total = math && rw ? math + rw : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const res = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        testType,
        testName: testName.trim() || undefined,
        testDate,
        mathScore: parseInt(mathScore),
        rwScore: parseInt(rwScore),
        notes: notes.trim() || undefined,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Failed to save score");
      return;
    }

    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card p-6 max-w-md w-full flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text)]">Add Score</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--s2)] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Test type */}
          <div>
            <label className="text-xs text-[var(--muted)] uppercase tracking-widest font-semibold block mb-2">
              Test Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TEST_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTestType(t.value)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left ${
                    testType === t.value
                      ? "bg-[var(--math)] border-transparent text-[var(--bg)]"
                      : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  <span className="block font-semibold">{t.label}</span>
                  <span className="block opacity-70 text-[10px]">{t.range}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Test name + date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--muted)] uppercase tracking-widest font-semibold block mb-1.5">
                Test Name <span className="normal-case font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="e.g. Khan #3"
                maxLength={120}
                className="w-full bg-[var(--s2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] uppercase tracking-widest font-semibold block mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                required
                className="w-full bg-[var(--s2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none"
              />
            </div>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--muted)] uppercase tracking-widest font-semibold block mb-1.5">
                Math Score
              </label>
              <input
                type="number"
                value={mathScore}
                onChange={(e) => setMathScore(e.target.value)}
                placeholder={`${sectionMin}–${sectionMax}`}
                min={sectionMin}
                max={sectionMax}
                step={10}
                required
                className="w-full bg-[var(--s2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] uppercase tracking-widest font-semibold block mb-1.5">
                Reading &amp; Writing
              </label>
              <input
                type="number"
                value={rwScore}
                onChange={(e) => setRwScore(e.target.value)}
                placeholder={`${sectionMin}–${sectionMax}`}
                min={sectionMin}
                max={sectionMax}
                step={10}
                required
                className="w-full bg-[var(--s2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Total preview */}
          {total !== null && (
            <div className="flex items-center justify-between rounded-lg bg-[var(--s2)] px-4 py-3 border border-[var(--border)]">
              <span className="text-xs text-[var(--muted)] uppercase tracking-widest font-semibold">Total</span>
              <span className="font-mono text-2xl font-bold text-[var(--text)]">{total}</span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs text-[var(--muted)] uppercase tracking-widest font-semibold block mb-1.5">
              Notes <span className="normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. ran out of time on reading, geometry felt weak…"
              maxLength={500}
              rows={2}
              className="w-full bg-[var(--s2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="math" size="sm" loading={saving}>
              Save Score
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
