"use client";

import clsx from "clsx";
import { MoonIcon } from "@phosphor-icons/react/dist/csr/Moon";
import { SunIcon } from "@phosphor-icons/react/dist/csr/Sun";
import { useAppTheme } from "@/components/use-app-theme";

export function ThemeToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { theme, setTheme } = useAppTheme();

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={clsx(
        "focus-ring border border-line/15 bg-surface/80 text-ink shadow-sm transition hover:border-accent/30 hover:bg-muted hover:text-accent",
        compact ? "grid h-11 w-11 place-items-center rounded-md lg:h-10 lg:w-10" : "inline-flex h-11 items-center lg:h-10 gap-2 rounded-md px-3 text-sm font-semibold",
        className
      )}
      aria-label={isDark ? "Skipta yfir í ljóst þema" : "Skipta yfir í dökkt þema"}
      title={isDark ? "Ljóst þema" : "Dökkt þema"}
    >
      {isDark ? <SunIcon className="icon-pop" size={18} weight="duotone" aria-hidden="true" /> : <MoonIcon className="icon-pop" size={18} weight="duotone" aria-hidden="true" />}
      {compact ? null : <span>{isDark ? "Ljóst" : "Dökkt"}</span>}
    </button>
  );
}
