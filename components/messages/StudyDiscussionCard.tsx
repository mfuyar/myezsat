"use client";

import { parseStudyDiscussionMessage, type StudyDiscussionPayload } from "@/lib/messages/study-discussion";

function labelSubject(subject: "math" | "ela") {
  return subject === "math" ? "Math" : "Reading and Writing";
}

function StudyDiscussionCard({ payload }: { payload: StudyDiscussionPayload }) {
  const color = payload.subject === "math" ? "var(--math)" : "var(--ela)";

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg)] text-left shadow-sm">
      <div className="border-b border-[var(--border)] px-3 py-2" style={{ borderLeft: `4px solid ${color}` }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
          Study discussion
        </p>
        <p className="mt-0.5 text-sm font-semibold text-[var(--text)]">
          {payload.kind === "question" ? "Question help" : payload.topicLabel}
        </p>
      </div>

      <div className="flex flex-col gap-2 px-3 py-3">
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-md border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
            {labelSubject(payload.subject)}
          </span>
          <span className="rounded-md border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
            {payload.topicId.replace(/-/g, " ")}
          </span>
          {payload.kind === "question" && payload.difficulty && (
            <span className="rounded-md border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
              {payload.difficulty}
            </span>
          )}
        </div>

        {payload.kind === "question" ? (
          <>
            {payload.passage && (
              <p className="max-h-20 overflow-hidden rounded-md bg-[var(--s2)] px-2 py-1.5 text-[11px] leading-relaxed text-[var(--muted)]">
                {payload.passage}
              </p>
            )}
            <p className="text-sm font-medium leading-relaxed text-[var(--text)]">{payload.question}</p>
            {(payload.selectedAnswer || payload.correctAnswer) && (
              <p className="text-[11px] text-[var(--muted)]">
                {payload.selectedAnswer ? `Picked ${payload.selectedAnswer}` : "No answer picked"}
                {payload.correctAnswer ? `; correct answer ${payload.correctAnswer}` : ""}
                {typeof payload.wasCorrect === "boolean" ? (payload.wasCorrect ? " (correct)" : " (needs review)") : ""}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm leading-relaxed text-[var(--text)]">
            Let's work on {payload.topicLabel}. Share an explanation, example, or practice shortcut here.
          </p>
        )}

        {payload.note && (
          <p className="rounded-md bg-[var(--s2)] px-2 py-1.5 text-xs leading-relaxed text-[var(--text)]">
            {payload.note}
          </p>
        )}
      </div>
    </div>
  );
}

export default function MessageContent({ content }: { content: string }) {
  const payload = parseStudyDiscussionMessage(content);
  if (payload) return <StudyDiscussionCard payload={payload} />;

  return <>{content}</>;
}
