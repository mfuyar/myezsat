import type { Metadata } from "next";
import ThemeToggle from "@/components/ui/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "myezsat — SAT Prep for Necdet Kerem",
  description: "AI-powered SAT prep. Math & ELA tutoring, progress tracking, streaks.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var saved = localStorage.getItem('theme');
                var theme = saved === 'light' || saved === 'dark'
                  ? saved
                  : (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
                document.documentElement.dataset.theme = theme;
              } catch (_) {
                document.documentElement.dataset.theme = 'dark';
              }
            `,
          }}
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <ThemeToggle />
        <footer className="border-t border-[var(--border)] px-6 py-5 text-center text-xs leading-relaxed text-[var(--muted)]">
          <p>
            SAT® is a registered trademark of the College Board, which is not affiliated with, and does not endorse, MyEzSAT.
          </p>
          <p className="mt-1">
            PSAT/NMSQT® is a registered trademark of the College Board and National Merit Scholarship Corporation,
            which are not affiliated with, and do not endorse, MyEzSAT.
          </p>
        </footer>
      </body>
    </html>
  );
}
