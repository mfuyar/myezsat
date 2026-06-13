"use client";

import { useCallback, useEffect, useState } from "react";
import ScoreEntryModal from "./ScoreEntryModal";

interface ScoreEntry {
  id: string;
  testType: string;
  testName: string | null;
  testDate: string;
  mathScore: number;
  rwScore: number;
  totalScore: number;
  notes: string | null;
}

const TEST_LABELS: Record<string, string> = {
  sat:        "SAT",
  psat_nmsqt: "PSAT/NMSQT",
  psat10:     "PSAT 10",
  psat89:     "PSAT 8/9",
  practice:   "Practice",
};

const SAT_MAX = 1600;
const PSAT_NMSQT_MAX = 1520;
const MAX_BY_TYPE: Record<string, number> = {
  sat:        1600,
  practice:   1600,
  psat_nmsqt: 1520,
  psat10:     1520,
  psat89:     1440,
};

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-[var(--s3)] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="font-mono text-xs text-[var(--muted)] w-8 text-right">{value}</span>
    </div>
  );
}

function weakArea(entry: ScoreEntry): "math" | "rw" | null {
  const diff = entry.mathScore - entry.rwScore;
  if (Math.abs(diff) < 30) return null;
  return diff < 0 ? "math" : "rw";
}

export default function ScoreSection() {
  const [entries, setEntries] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchScores = useCallback(async () => {
    const res = await fetch("/api/scores");
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchScores(); }, [fetchScores]);

  const latest = entries[0] ?? null;
  const weak = latest ? weakArea(latest) : null;
  const maxScore = latest ? MAX_BY_TYPE[latest.testType] : SAT_MAX;
  const sectionMax = maxScore / 2;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs uppercase tracking-widest text-[var(--muted)] font-semibold">
          My Scores
        </h2>
        <button
          onClick={() => setModalOpen(true)}
          className="text-xs text-[var(--math)] hover:opacity-80 transition-opacity font-medium"
        >
          + Add Score
        </button>
      </div>

      {loading ? (
        <div className="card p-6 flex items-center justify-center">
          <span className="text-sm text-[var(--muted)]">Loading…</span>
        </div>
      ) : entries.length === 0 ? (
        <div
          className="card p-6 flex flex-col items-center gap-3 text-center border-dashed cursor-pointer hover:bg-[var(--s2)] transition-colors"
          onClick={() => setModalOpen(true)}
        >
          <span className="text-3xl">📊</span>
          <div>
            <p className="text-sm font-medium text-[var(--text)]">Add your first score</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              SAT, PSAT, or practice test — we&apos;ll personalize your study focus
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Latest score highlight */}
          <div className="card p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-[var(--muted)] uppercase tracking-widest font-semibold mb-1">
                  Latest — {TEST_LABELS[latest!.testType]}{latest!.testName ? ` · ${latest.testName}` : ""}
                </p>
                <p className="font-mono text-4xl font-bold text-[var(--text)] leading-none">
                  {latest!.totalScore}
                  <span className="text-base font-normal text-[var(--muted)] ml-1">/ {maxScore}</span>
                </p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  {new Date(latest!.testDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>

              {weak && (
                <div
                  className="flex-shrink-0 rounded-xl px-3 py-2 text-xs font-semibold text-center"
                  style={{
                    background: weak === "math" ? "var(--math-bg)" : "var(--ela-bg)",
                    color: weak === "math" ? "var(--math)" : "var(--ela)",
                  }}
                >
                  <p className="text-[10px] font-medium opacity-70 mb-0.5">Focus area</p>
                  {weak === "math" ? "Math" : "Reading & Writing"}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div>
                <p className="text-[10px] text-[var(--muted)] font-medium mb-1">Math</p>
                <ScoreBar value={latest!.mathScore} max={sectionMax} color="var(--math)" />
              </div>
              <div>
                <p className="text-[10px] text-[var(--muted)] font-medium mb-1">Reading &amp; Writing</p>
                <ScoreBar value={latest!.rwScore} max={sectionMax} color="var(--ela)" />
              </div>
            </div>

            {latest!.notes && (
              <p className="text-xs text-[var(--muted)] italic border-t border-[var(--border)] pt-3">
                {latest.notes}
              </p>
            )}
          </div>

          {/* History list */}
          {entries.length > 1 && (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {["Date", "Test", "Math", "R&W", "Total"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10px] text-[var(--muted)] font-medium uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.slice(1).map((e, i) => (
                    <tr key={e.id} className={i < entries.length - 2 ? "border-b border-[var(--border)]" : ""}>
                      <td className="px-4 py-2.5 text-[var(--muted)] text-xs whitespace-nowrap">
                        {new Date(e.testDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--muted)] text-xs">
                        {TEST_LABELS[e.testType]}{e.testName ? ` · ${e.testName}` : ""}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs" style={{ color: "var(--math)" }}>{e.mathScore}</td>
                      <td className="px-4 py-2.5 font-mono text-xs" style={{ color: "var(--ela)" }}>{e.rwScore}</td>
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold text-[var(--text)]">{e.totalScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <ScoreEntryModal
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); fetchScores(); }}
        />
      )}
    </section>
  );
}
