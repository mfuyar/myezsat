"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/reset-password`,
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <header className="px-8 py-6">
        <Link href="/" className="font-serif italic text-2xl text-[var(--text)]">
          myezsat
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="card p-8">
            {sent ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-12 h-12 rounded-full bg-[var(--green)]/10 flex items-center justify-center text-2xl">
                  ✉️
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-[var(--text)]">Check your email</h1>
                  <p className="text-sm text-[var(--muted)] mt-1">
                    We sent a reset link to <span className="text-[var(--text)]">{email}</span>
                  </p>
                </div>
                <Link href="/login" className="text-sm text-[var(--math)] hover:underline">
                  Back to sign in
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h1 className="text-xl font-semibold text-[var(--text)]">Forgot password?</h1>
                  <p className="text-sm text-[var(--muted)] mt-1">
                    Enter your email and we&apos;ll send a reset link.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <Input
                    id="email"
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    error={error || undefined}
                  />
                  <Button type="submit" loading={loading} size="lg" className="w-full">
                    Send reset link
                  </Button>
                </form>

                <p className="text-center text-sm text-[var(--muted)] mt-6">
                  <Link href="/login" className="text-[var(--text)] hover:underline">
                    Back to sign in
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
