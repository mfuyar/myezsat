import Link from "next/link";

export const metadata = { title: "Terms of Service — MyEzSAT" };

export default function TermsPage() {
  const updated = "June 13, 2026";
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <nav className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-serif italic text-xl text-[var(--text)]">myezsat</Link>
        <Link href="/signup" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">← Back to sign up</Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 prose prose-invert">
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Terms of Service</h1>
        <p className="text-sm text-[var(--muted)] mb-8">Last updated: {updated}</p>

        <div className="flex flex-col gap-8 text-[var(--text)] text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold mb-3">1. Acceptance of Terms</h2>
            <p>By creating an account or using MyEzSAT ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. Users under 18 must have parental or guardian consent. Users under 13 are not permitted to use the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. Description of Service</h2>
            <p>MyEzSAT is an educational web application designed to help students prepare for the SAT exam through AI-assisted tutoring, practice questions, progress tracking, and study tools. The Service is intended for students, parents, and educators.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. User Accounts</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You must provide accurate information when creating your account.</li>
              <li>You may not share your account with others or create accounts on behalf of third parties without authorization.</li>
              <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to other accounts or systems</li>
              <li>Submit false, misleading, or harmful content</li>
              <li>Harass, bully, or threaten other users</li>
              <li>Use automated bots or scripts to manipulate scores or leaderboards</li>
              <li>Share copyrighted SAT materials through the platform</li>
              <li>Impersonate another person or entity</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. Educational Content</h2>
            <p>MyEzSAT provides original educational content and AI-generated study materials. We do not reproduce or distribute copyrighted College Board materials. Practice questions are original content created for educational purposes. For official SAT preparation materials, refer to the College Board at <a href="https://www.collegeboard.org" className="text-[var(--ela)] underline">collegeboard.org</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. AI Tutor</h2>
            <p>Our AI tutor uses Google Gemini to generate educational responses. AI-generated content may contain errors. Always verify important information with official sources. The AI tutor is not a substitute for professional educational guidance.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. Social Features</h2>
            <p>Friends, messaging, and leaderboard features are subject to our community guidelines. We reserve the right to moderate content, remove messages, and suspend users who engage in harassment or inappropriate behavior. Messaging features are limited to connected friends and should not be used to share personal contact information.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. Account Suspension and Termination</h2>
            <p>We may suspend or terminate your account for violations of these terms. Suspended accounts lose access to the Service but data is preserved for 30 days. Deleted accounts are soft-deleted and may be recovered within 30 days. After 30 days, data may be permanently removed.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">9. Disclaimers</h2>
            <p>The Service is provided "as is" without warranties of any kind. We do not guarantee specific SAT score improvements. Practice results on MyEzSAT do not predict official SAT performance.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">10. Changes to Terms</h2>
            <p>We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms. We will notify users of significant changes via email.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">11. Contact</h2>
            <p>Questions about these Terms? Contact us at <a href="mailto:support@myezsat.com" className="text-[var(--ela)] underline">support@myezsat.com</a>.</p>
          </section>

        </div>
      </main>
    </div>
  );
}
