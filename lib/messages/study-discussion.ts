export const STUDY_DISCUSSION_PREFIX = "[myezsat-study-discussion]";

export type StudyDiscussionPayload =
  | {
      kind: "question";
      questionId: string;
      subject: "math" | "ela";
      topicId: string;
      difficulty?: string;
      question: string;
      passage?: string | null;
      selectedAnswer?: string;
      correctAnswer?: string;
      wasCorrect?: boolean;
      note?: string;
    }
  | {
      kind: "topic";
      subject: "math" | "ela";
      topicId: string;
      topicLabel: string;
      note?: string;
    };

function truncate(value: string | null | undefined, max: number) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 3).trim()}...`;
}

export function createStudyDiscussionMessage(payload: StudyDiscussionPayload) {
  const compact =
    payload.kind === "question"
      ? {
          ...payload,
          question: truncate(payload.question, 700) ?? "",
          passage: truncate(payload.passage, 300),
          note: truncate(payload.note, 240),
        }
      : {
          ...payload,
          note: truncate(payload.note, 240),
        };

  return `${STUDY_DISCUSSION_PREFIX}${JSON.stringify(compact)}`;
}

export function parseStudyDiscussionMessage(content: string): StudyDiscussionPayload | null {
  if (!content.startsWith(STUDY_DISCUSSION_PREFIX)) return null;

  try {
    const parsed = JSON.parse(content.slice(STUDY_DISCUSSION_PREFIX.length));
    if (parsed?.kind === "question" && parsed.questionId && parsed.subject && parsed.topicId && parsed.question) {
      return parsed as StudyDiscussionPayload;
    }
    if (parsed?.kind === "topic" && parsed.subject && parsed.topicId && parsed.topicLabel) {
      return parsed as StudyDiscussionPayload;
    }
  } catch {
    return null;
  }

  return null;
}
