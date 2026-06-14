import { cn } from "@/lib/utils";
import type { ChatMessage, Subject } from "@/types";

interface MessageBubbleProps {
  message: ChatMessage;
  subject: Subject;
  streaming?: boolean;
}

export default function MessageBubble({ message, subject, streaming }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isMath = subject === "math";
  const color = isMath ? "var(--math)" : "var(--ela)";

  const renderContent = (text: string) => {
    const parts = text.split(/(✓\s*ANSWER:[^\n]*|\[CALC\]|\[NO CALC\])/g);
    return parts.map((part, i) => {
      if (/✓\s*ANSWER:/i.test(part)) {
        return (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-mono font-semibold border"
            style={{ background: "var(--ela-bg)", borderColor: "var(--ela)", color: "var(--ela)" }}
          >
            {part}
          </span>
        );
      }
      if (part === "[CALC]") {
        return (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border"
            style={{ background: "var(--math-bg)", borderColor: "var(--math)", color: "var(--math)" }}
            title="Calculator allowed"
          >
            🖩 Calculator OK
          </span>
        );
      }
      if (part === "[NO CALC]") {
        return (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border border-orange-500/40 text-orange-400"
            style={{ background: "rgba(251,146,60,0.08)" }}
            title="No calculator — solve by hand"
          >
            ✏️ No Calculator
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (isUser) {
    return (
      <div className="flex justify-end msg-enter">
        <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-sm bg-[var(--s3)] border border-[var(--border)]">
          <p className="text-base text-[var(--text)] whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 msg-enter">
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-[var(--bg)]"
        style={{ background: color }}
      >
        {isMath ? "M" : "E"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium mb-1.5" style={{ color }}>
          {isMath ? "Math Tutor" : "English Tutor"}
        </p>
        <p
          className={cn(
            "text-base text-[var(--text)] whitespace-pre-wrap leading-relaxed",
            streaming && message.content === "" && "streaming-cursor"
          )}
        >
          {message.content
            ? renderContent(message.content)
            : streaming
            ? null
            : "…"}
          {streaming && message.content && <span className="streaming-cursor" />}
        </p>
      </div>
    </div>
  );
}
