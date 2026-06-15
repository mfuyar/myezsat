"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

type Subscription = {
  enabled: boolean;
  deliveryHour: number;
  timezone: string;
  lastSentAt: string | Date | null;
};

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
];

export default function VocabSettingsForm({
  initial,
  emailConfigured,
}: {
  initial: Subscription;
  emailConfigured: boolean;
}) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [deliveryHour, setDeliveryHour] = useState(initial.deliveryHour);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const res = await fetch("/api/vocab/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, deliveryHour, timezone }),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ? JSON.stringify(data.error) : "Could not save settings.");
      return;
    }

    setMessage(enabled ? "Vocabulary emails are on." : "Vocabulary emails are off.");
  }

  return (
    <form onSubmit={save} className="card p-5 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">Daily vocabulary email</h2>
          <p className="text-sm text-[var(--muted)] mt-1">Get three SAT words in your inbox each day.</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span className="w-11 h-6 rounded-full bg-[var(--s3)] peer-checked:bg-[var(--math)] transition-colors after:content-[''] after:absolute after:left-1 after:top-1 after:w-4 after:h-4 after:bg-[var(--text)] after:rounded-full after:transition-transform peer-checked:after:translate-x-5" />
        </label>
      </div>

      {!emailConfigured ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--s2)] p-3">
          <p className="text-sm font-medium text-[var(--text)]">Email sending is not configured yet.</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
            Add `RESEND_API_KEY` and a verified `VOCAB_EMAIL_FROM` sender in Vercel/local env before daily vocab emails can send.
          </p>
        </div>
      ) : null}

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-[var(--muted)] font-semibold">Delivery time</span>
          <select
            value={deliveryHour}
            onChange={(e) => setDeliveryHour(Number(e.target.value))}
            className="bg-[var(--s2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none"
          >
            {Array.from({ length: 24 }, (_, hour) => (
              <option key={hour} value={hour}>
                {new Date(2024, 0, 1, hour).toLocaleTimeString([], { hour: "numeric" })}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-[var(--muted)] font-semibold">Timezone</span>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="bg-[var(--s2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none"
          >
            {TIMEZONES.map((zone) => (
              <option key={zone} value={zone}>{zone.replace("_", " ")}</option>
            ))}
          </select>
        </label>
      </div>

      {initial.lastSentAt ? (
        <p className="text-xs text-[var(--muted)]">
          Last sent {new Date(initial.lastSentAt).toLocaleString()}
        </p>
      ) : null}

      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      {message ? <p className="text-xs text-[var(--green)]">{message}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" variant="math" loading={saving}>Save Settings</Button>
      </div>
    </form>
  );
}
