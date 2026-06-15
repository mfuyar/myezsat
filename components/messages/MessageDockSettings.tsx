"use client";

import { useEffect, useState } from "react";

const ENABLED_KEY = "myezsat.messageDock.enabled";
const OPEN_KEY = "myezsat.messageDock.openByDefault";

function readStoredBool(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key);
  if (value === null) return fallback;
  return value === "true";
}

function writeSetting(key: string, value: boolean) {
  window.localStorage.setItem(key, String(value));
  window.dispatchEvent(new Event("myezsat:message-dock-settings"));
}

export default function MessageDockSettings() {
  const [enabled, setEnabled] = useState(true);
  const [openByDefault, setOpenByDefault] = useState(false);

  useEffect(() => {
    setEnabled(readStoredBool(ENABLED_KEY, true));
    setOpenByDefault(readStoredBool(OPEN_KEY, false));
  }, []);

  return (
    <section className="card p-5 flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-[var(--text)]">Message Dock</p>
        <p className="text-xs text-[var(--muted)] mt-1">
          Show messages and unread notifications as a right-side dock while you study.
        </p>
      </div>

      <label className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border)] bg-[var(--s2)] px-3 py-2">
        <span>
          <span className="block text-sm text-[var(--text)]">Enable message dock</span>
          <span className="block text-[10px] text-[var(--muted)]">Adds a floating messages button with unread count.</span>
        </span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => {
            const value = event.target.checked;
            setEnabled(value);
            writeSetting(ENABLED_KEY, value);
          }}
          className="h-4 w-4 accent-[var(--ela)]"
        />
      </label>

      <label className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border)] bg-[var(--s2)] px-3 py-2">
        <span>
          <span className="block text-sm text-[var(--text)]">Open dock by default</span>
          <span className="block text-[10px] text-[var(--muted)]">Keeps the right-side message panel open after page loads.</span>
        </span>
        <input
          type="checkbox"
          checked={openByDefault}
          disabled={!enabled}
          onChange={(event) => {
            const value = event.target.checked;
            setOpenByDefault(value);
            writeSetting(OPEN_KEY, value);
          }}
          className="h-4 w-4 accent-[var(--ela)] disabled:opacity-50"
        />
      </label>
    </section>
  );
}
