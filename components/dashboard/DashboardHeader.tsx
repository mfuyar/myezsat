"use client";

import { useEffect, useState } from "react";
import StreakBadge from "./StreakBadge";

interface DashboardHeaderProps {
  name: string | null;
  streak: number;
}

export default function DashboardHeader({ name, streak }: DashboardHeaderProps) {
  const displayName = name ?? "there";
  const [localTime, setLocalTime] = useState({ greeting: "Hello", dateLabel: "" });

  useEffect(() => {
    const updateLocalTime = () => {
      const now = new Date();
      const h = now.getHours();
      const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
      const dateLabel = now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });

      setLocalTime({ greeting, dateLabel });
    };

    updateLocalTime();
    const interval = window.setInterval(updateLocalTime, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text)]">
          {localTime.greeting},{" "}
          <span className="font-serif italic text-[var(--math)]">{displayName}.</span>
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">{localTime.dateLabel}</p>
      </div>
      <StreakBadge current={streak} />
    </div>
  );
}
