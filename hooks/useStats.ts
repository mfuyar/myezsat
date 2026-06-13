"use client";

import { useEffect, useState } from "react";
import type { UserStats, TopicProgress, Streak, StudySession } from "@/types";

interface StatsData {
  stats: UserStats | null;
  topicProgress: TopicProgress[];
  streak: Streak | null;
  recentSessions: StudySession[];
  loading: boolean;
}

export function useStats(): StatsData {
  const [data, setData] = useState<Omit<StatsData, "loading">>({
    stats: null,
    topicProgress: [],
    streak: null,
    recentSessions: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((json) => {
        setData({
          stats: json.stats ?? null,
          topicProgress: json.topicProgress ?? [],
          streak: json.streak ?? null,
          recentSessions: json.recentSessions ?? [],
        });
      })
      .finally(() => setLoading(false));
  }, []);

  return { ...data, loading };
}
