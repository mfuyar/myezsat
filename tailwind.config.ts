import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        s1: "var(--s1)",
        s2: "var(--s2)",
        s3: "var(--s3)",
        border: "var(--border)",
        text: "var(--text)",
        muted: "var(--muted)",
        math: "var(--math)",
        "math-bg": "var(--math-bg)",
        ela: "var(--ela)",
        "ela-bg": "var(--ela-bg)",
        green: "var(--green)",
        red: "var(--red)",
      },
      fontFamily: {
        serif: ["'Instrument Serif'", "serif"],
        sans: ["'DM Sans'", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        card: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
