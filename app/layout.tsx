import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "myezsat — SAT Prep for Necdet Kerem",
  description: "AI-powered SAT prep. Math & ELA tutoring, progress tracking, streaks.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
