import Link from "next/link";
import SignupForm from "@/components/auth/SignupForm";

export default function SignupPage() {
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
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-[var(--text)]">Create your account</h1>
              <p className="text-sm text-[var(--muted)] mt-1">Start your SAT prep journey</p>
            </div>

            <SignupForm />

            <p className="text-center text-sm text-[var(--muted)] mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-[var(--text)] hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-4 flex flex-col items-center gap-2">
            <Link
              href="/demo"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--math)] transition-all"
            >
              <span>⚡</span> Try a free demo first — no account needed
            </Link>
            <p className="text-xs text-[var(--muted)]">For Necdet Kerem — SAT 2027</p>
          </div>
        </div>
      </main>
    </div>
  );
}
