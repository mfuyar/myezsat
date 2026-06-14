"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
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
      />
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-[var(--text)]">Password</label>
          <Link href="/forgot-password" className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors">
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          error={error || undefined}
        />
      </div>

      <Button type="submit" loading={loading} className="mt-1 w-full" size="lg">
        Sign in
      </Button>

      <p className="text-[11px] text-[var(--muted)] text-center leading-relaxed">
        By signing in you agree to our{" "}
        <Link href="/terms" className="underline hover:text-[var(--text)] transition-colors">Terms of Service</Link>
        {" "}and{" "}
        <Link href="/privacy" className="underline hover:text-[var(--text)] transition-colors">Privacy Policy</Link>.
        This platform is designed for students aged 13+.
      </p>
    </form>
  );
}
