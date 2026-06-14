"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const AVATARS = [
  { id: "owl",     emoji: "🦉", bg: "#3b5bdb" },
  { id: "rocket",  emoji: "🚀", bg: "#c9943d" },
  { id: "star",    emoji: "⭐", bg: "#4e9d9b" },
  { id: "brain",   emoji: "🧠", bg: "#7c3aed" },
  { id: "book",    emoji: "📚", bg: "#059669" },
  { id: "fire",    emoji: "🔥", bg: "#dc2626" },
  { id: "diamond", emoji: "💎", bg: "#0284c7" },
  { id: "trophy",  emoji: "🏆", bg: "#d97706" },
  { id: "lightning",emoji:"⚡", bg: "#7c3aed" },
  { id: "target",  emoji: "🎯", bg: "#4e9d9b" },
  { id: "pencil",  emoji: "✏️", bg: "#c9943d" },
  { id: "globe",   emoji: "🌍", bg: "#059669" },
];

export default function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) { setError("Please agree to the Terms of Service and Privacy Policy to continue."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, avatar_url: `avatar:${avatar.id}:${avatar.bg}`, agreed_to_terms: true } },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const setupRes = await fetch("/api/auth/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, agreedToTerms: true }),
    });

    if (!setupRes.ok) {
      const data = await setupRes.json().catch(() => ({}));
      setError(data.error ?? "Could not finish account setup.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Avatar picker */}
      <div>
        <p className="text-sm font-medium text-[var(--text)] mb-3">Choose your avatar</p>
        <div className="grid grid-cols-6 gap-2">
          {AVATARS.map((a) => (
            <button key={a.id} type="button" onClick={() => setAvatar(a)}
              className={`w-full aspect-square rounded-xl flex items-center justify-center text-xl transition-all ${avatar.id === a.id ? "ring-2 ring-offset-2 ring-offset-[var(--bg)] scale-110" : "opacity-60 hover:opacity-90"}`}
              style={{ background: a.bg, "--tw-ring-color": a.bg } as React.CSSProperties}>
              {a.emoji}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: avatar.bg }}>
            {avatar.emoji}
          </div>
          <p className="text-xs text-[var(--muted)]">Selected avatar — you can change this later in settings.</p>
        </div>
      </div>

      <Input id="name" label="Full Name" type="text" placeholder="First Name Last Name"
        value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />

      <Input id="email" label="Email" type="email" placeholder="you@example.com"
        value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />

      <Input id="password" label="Password" type="password" placeholder="Min. 8 characters"
        value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password"
        minLength={8}
        error={error || undefined} />

      {/* Terms agreement */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
          required
          className="mt-0.5 accent-[var(--math)] w-4 h-4 flex-shrink-0" />
        <span className="text-xs text-[var(--muted)] leading-relaxed">
          I agree to the{" "}
          <Link href="/terms" target="_blank" className="underline hover:text-[var(--text)] transition-colors">Terms of Service</Link>
          {" "}and{" "}
          <Link href="/privacy" target="_blank" className="underline hover:text-[var(--text)] transition-colors">Privacy Policy</Link>.
          I confirm I am at least 13 years old. If under 18, I have parental permission to create this account.
        </span>
      </label>

      <Button type="submit" loading={loading} className="w-full" size="lg">
        Create account
      </Button>
    </form>
  );
}
