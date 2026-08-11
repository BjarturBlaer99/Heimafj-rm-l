import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        onAccent: "rgb(var(--color-on-accent) / <alpha-value>)",
        lagoon: "rgb(var(--color-lagoon) / <alpha-value>)",
        moss: "rgb(var(--color-moss) / <alpha-value>)",
        mint: "rgb(var(--color-mint) / <alpha-value>)",
        coral: "rgb(var(--color-coral) / <alpha-value>)",
        gold: "rgb(var(--color-gold) / <alpha-value>)",
        violet: "rgb(var(--color-violet) / <alpha-value>)",
        steel: "rgb(var(--color-steel) / <alpha-value>)",
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)"
      },
      boxShadow: {
        soft: "0 1px 2px rgba(var(--shadow-soft) / 0.06), 0 8px 24px rgba(var(--shadow-soft) / 0.06)"
      }
    }
  },
  plugins: []
} satisfies Config;
