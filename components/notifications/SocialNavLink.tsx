"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type NotificationCounts = {
  messagesTotal: number;
  pendingFriendRequests: number;
};

type SocialNavLinkProps = {
  href: "/messages" | "/friends";
  children: React.ReactNode;
  className?: string;
};

function formatCount(count: number) {
  return count > 99 ? "99+" : String(count);
}

export default function SocialNavLink({ href, children, className }: SocialNavLinkProps) {
  const [counts, setCounts] = useState<NotificationCounts>({ messagesTotal: 0, pendingFriendRequests: 0 });

  const loadCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setCounts({
        messagesTotal: data.messagesTotal ?? 0,
        pendingFriendRequests: data.pendingFriendRequests ?? 0,
      });
    } catch {
      // Notification badges are helpful, but navigation should stay quiet if counts fail.
    }
  }, []);

  useEffect(() => {
    loadCounts();
    const interval = window.setInterval(loadCounts, 45_000);
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") loadCounts();
    };

    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [loadCounts]);

  const count = href === "/messages" ? counts.messagesTotal : counts.pendingFriendRequests;

  return (
    <Link href={href} className={`relative inline-flex items-center gap-1.5 ${className ?? ""}`}>
      <span>{children}</span>
      {count > 0 && (
        <span className="min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
          {formatCount(count)}
        </span>
      )}
    </Link>
  );
}
