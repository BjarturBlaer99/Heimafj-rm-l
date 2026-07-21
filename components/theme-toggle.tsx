"use client";

import clsx from "clsx";
import { MoonIcon } from "@phosphor-icons/react/dist/csr/Moon";
import { SunIcon } from "@phosphor-icons/react/dist/csr/Sun";
import { useEffect, useState } from "react";

const storageKey = "finance-theme-metallic";

function getPreferredTheme() {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(storageKey);
  if (stored === "light" || stored === "dark") return stored;
  return "light";
}

export function ThemeToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const nextTheme = getPreferredTheme();
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    window.localStorage.setItem(storageKey, nextTheme);
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={clsx(
        "focus-ring border border-line/15 bg-surface/80 text-ink shadow-sm transition hover:border-accent/30 hover:bg-muted hover:text-accent",
        compact ? "grid h-10 w-10 place-items-center rounded-md" : "inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold",
        className
      )}
      aria-label={isDark ? "Skipta yfir í ljóst þema" : "Skipta yfir í dökkt þema"}
      title={isDark ? "Ljóst þema" : "Dökkt þema"}
    >
      {isDark ? <SunIcon className="icon-pop" size={18} weight="duotone" /> : <MoonIcon className="icon-pop" size={18} weight="duotone" />}
      {compact ? null : <span>{isDark ? "Ljóst" : "Dökkt"}</span>}
    </button>
  );
}
