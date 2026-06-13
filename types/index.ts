export type Subject = "math" | "ela";
export type Difficulty = "easy" | "medium" | "hard";
export type MessageRole = "user" | "assistant";

export interface Topic {
  id: string;
  label: string;
  icon: string;
  subtopics: string[];
  subject: Subject;
  mathSection?: "1" | "2" | "both";
}

export interface ChatMessage {
  id?: string;
  role: MessageRole;
  content: string;
  createdAt?: string;
}

export interface StudySession {
  id: string;
  userId: string;
  subject: Subject;
  topicId: string;
  topicLabel: string;
  difficulty: Difficulty;
  durationSec: number;
  xpEarned: number;
  correct: number;
  total: number;
  completed: boolean;
  startedAt: string;
  endedAt?: string;
  messages?: ChatMessage[];
}

export interface TopicProgress {
  id: string;
  userId: string;
  subject: Subject;
  topicId: string;
  xp: number;
  correct: number;
  total: number;
  lastPracticed?: string;
}

export interface UserStats {
  id: string;
  userId: string;
  totalXP: number;
  mathXP: number;
  elaXP: number;
  totalSessions: number;
  mathSessions: number;
  elaSessions: number;
  mathCorrect: number;
  mathTotal: number;
  elaCorrect: number;
  elaTotal: number;
}

export interface Streak {
  id: string;
  userId: string;
  current: number;
  longest: number;
  lastStudied?: string;
}

export const MATH_TOPICS: Topic[] = [
  {
    id: "algebra",
    label: "Algebra",
    icon: "𝑥",
    subject: "math",
    mathSection: "1",
    subtopics: ["Linear equations", "Inequalities", "Systems of equations", "Quadratics", "Exponents"],
  },
  {
    id: "problem-solving",
    label: "Problem Solving",
    icon: "⚙",
    subject: "math",
    mathSection: "1",
    subtopics: ["Ratios & rates", "Percentages", "Unit conversion", "Data interpretation", "Word problems"],
  },
  {
    id: "statistics",
    label: "Statistics",
    icon: "📊",
    subject: "math",
    mathSection: "both",
    subtopics: ["Mean/median/mode", "Probability", "Data distributions", "Scatter plots", "Sampling"],
  },
  {
    id: "advanced-math",
    label: "Advanced Math",
    icon: "∑",
    subject: "math",
    mathSection: "2",
    subtopics: ["Polynomial operations", "Rational expressions", "Radicals", "Functions", "Complex numbers"],
  },
  {
    id: "geometry",
    label: "Geometry & Trig",
    icon: "△",
    subject: "math",
    mathSection: "2",
    subtopics: ["Lines & angles", "Triangles", "Circles", "Area & volume", "Trigonometry"],
  },
];

export const ELA_TOPICS: Topic[] = [
  {
    id: "reading-comprehension",
    label: "Reading Comprehension",
    icon: "📖",
    subject: "ela",
    subtopics: ["Main idea", "Inference", "Evidence-based claims", "Tone & purpose", "Paired passages"],
  },
  {
    id: "grammar",
    label: "Grammar & Usage",
    icon: "✏️",
    subject: "ela",
    subtopics: ["Subject-verb agreement", "Pronouns", "Modifiers", "Parallel structure", "Verb tense"],
  },
  {
    id: "punctuation",
    label: "Punctuation",
    icon: "·",
    subject: "ela",
    subtopics: ["Commas", "Semicolons & colons", "Dashes", "Apostrophes", "End punctuation"],
  },
  {
    id: "rhetoric",
    label: "Rhetoric & Style",
    icon: "💬",
    subject: "ela",
    subtopics: ["Argument structure", "Transitions", "Concision", "Word choice", "Sentence combining"],
  },
  {
    id: "vocabulary",
    label: "Vocabulary in Context",
    icon: "🔤",
    subject: "ela",
    subtopics: ["Connotation", "Context clues", "Register & tone", "Word relationships", "Domain-specific terms"],
  },
];
