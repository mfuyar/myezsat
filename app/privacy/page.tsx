import Link from "next/link";

export const metadata = { title: "Privacy Policy — MyEzSAT" };

export default function PrivacyPage() {
  const updated = "June 13, 2026";
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <nav className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-serif italic text-xl text-[var(--text)]">myezsat</Link>
        <Link href="/signup" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">← Back to sign up</Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Privacy Policy</h1>
        <p className="text-sm text-[var(--muted)] mb-8">Last updated: {updated}</p>

        <div className="flex flex-col gap-8 text-[var(--text)] text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold mb-3">1. Introduction</h2>
            <p>MyEzSAT ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard information when you use our educational platform. This policy applies to all users, including students, parents, and educators. Because our platform is designed for minors, we follow COPPA (Children's Online Privacy Protection Act) and FERPA (Family Educational Rights and Privacy Act) principles.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. Information We Collect</h2>
            <h3 className="text-sm font-semibold mb-2 text-[var(--muted)]">2a. Information You Provide</h3>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>Account information: name, email address, password (hashed)</li>
              <li>Profile information: avatar selection, username</li>
              <li>SAT scores you voluntarily enter for personalization</li>
              <li>Messages sent to friends through the platform</li>
              <li>Notes and study content you create</li>
            </ul>
            <h3 className="text-sm font-semibold mb-2 text-[var(--muted)]">2b. Automatically Collected Information</h3>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>Practice session data: questions answered, accuracy, time spent</li>
              <li>Learning progress: XP earned, topics studied, streaks</li>
              <li>Usage data: pages visited, features used, session duration</li>
              <li>Device information: browser type, operating system (no device identifiers stored)</li>
            </ul>
            <h3 className="text-sm font-semibold mb-2 text-[var(--muted)]">2c. Information We Do NOT Collect</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Payment or financial information (no purchases required)</li>
              <li>Precise geolocation</li>
              <li>Biometric data</li>
              <li>Social Security numbers or government IDs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Educational service delivery:</strong> Personalize practice, generate recommendations, track progress</li>
              <li><strong>AI tutoring:</strong> Your question interactions are sent to Google Gemini API to generate responses. We do not share personal identifiers with AI providers.</li>
              <li><strong>Account management:</strong> Authentication, password recovery, account security</li>
              <li><strong>Safety and moderation:</strong> Detect and prevent abuse, enforce community guidelines</li>
              <li><strong>Service improvement:</strong> Analyze usage patterns to improve features (aggregated, anonymized)</li>
              <li><strong>Communications:</strong> Service updates, security alerts (no marketing without explicit consent)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. Children's Privacy (COPPA)</h2>
            <p className="mb-3">Our Service is designed for students aged 13 and older. We do not knowingly collect personal information from children under 13. If you believe your child under 13 has created an account, contact us immediately at <a href="mailto:privacy@myezsat.com" className="text-[var(--ela)] underline">privacy@myezsat.com</a> and we will delete the account.</p>
            <p className="mb-3">For users aged 13–17:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Parents/guardians can request access to, correction of, or deletion of their child's data</li>
              <li>Social features (messaging, friends) are limited to direct connections only — no public profiles visible to strangers</li>
              <li>We do not serve targeted advertising to any users</li>
              <li>Parental controls are available through the parent account feature</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. Data Sharing and Disclosure</h2>
            <p className="mb-3">We do not sell your personal information. We may share data with:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Service providers:</strong> Supabase (database/auth), Google Gemini (AI responses), Vercel (hosting). All under data processing agreements.</li>
              <li><strong>Legal requirements:</strong> If required by law, court order, or to protect safety</li>
              <li><strong>Other users:</strong> Your username and level are visible on leaderboards if your privacy setting is "public". Stats are only shared per your privacy preferences.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. Data Security</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Passwords are hashed and never stored in plain text</li>
              <li>All data is transmitted over HTTPS/TLS encryption</li>
              <li>Database access is restricted to authorized personnel only</li>
              <li>We conduct regular security reviews</li>
              <li>In case of a data breach, we will notify affected users within 72 hours</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. Your Rights and Choices</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update incorrect information in account settings</li>
              <li><strong>Deletion:</strong> Request account deletion — your data will be permanently removed within 30 days</li>
              <li><strong>Privacy settings:</strong> Control who sees your stats (public / friends only / private)</li>
              <li><strong>Data portability:</strong> Request an export of your practice history and progress data</li>
              <li><strong>Opt-out:</strong> Disable social features or leaderboard participation at any time</li>
            </ul>
            <p className="mt-3">To exercise these rights, contact <a href="mailto:privacy@myezsat.com" className="text-[var(--ela)] underline">privacy@myezsat.com</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. Data Retention</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Active accounts: data retained while account is active</li>
              <li>Deleted accounts: soft-deleted for 30 days, then permanently removed</li>
              <li>Practice history: retained for the lifetime of the account to track progress</li>
              <li>Messages: retained until explicitly deleted by participants</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">9. Cookies and Tracking</h2>
            <p>We use essential cookies only for authentication and session management. We do not use tracking cookies, advertising cookies, or cross-site tracking. We do not use Google Analytics, Facebook Pixel, or similar third-party trackers.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">10. Third-Party Links</h2>
            <p>The platform may link to external resources (College Board, Khan Academy, Desmos). We are not responsible for the privacy practices of these external sites.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">11. Changes to This Policy</h2>
            <p>We may update this policy periodically. Significant changes will be communicated via email and in-app notification. Continued use after changes constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">12. Contact Us</h2>
            <p>For privacy inquiries, data requests, or concerns:</p>
            <p className="mt-2">
              <strong>MyEzSAT Privacy Team</strong><br />
              Email: <a href="mailto:privacy@myezsat.com" className="text-[var(--ela)] underline">privacy@myezsat.com</a><br />
              Response time: Within 5 business days
            </p>
          </section>

        </div>
      </main>
    </div>
  );
}
