"use client";

import { useSyncExternalStore } from "react";

export type AppTheme = "light" | "dark";

const storageKey = "finance-theme-metallic";
const themeChangeEvent = "finance-theme-change";

function getTheme(): AppTheme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerTheme(): AppTheme {
  return "light";
}

function subscribe(onChange: () => void) {
  function syncStoredTheme(event: StorageEvent) {
    if (event.key !== storageKey && event.key !== null) return;
    document.documentElement.classList.toggle("dark", event.newValue === "dark");
    onChange();
  }

  window.addEventListener(themeChangeEvent, onChange);
  window.addEventListener("storage", syncStoredTheme);
  return () => {
    window.removeEventListener(themeChangeEvent, onChange);
    window.removeEventListener("storage", syncStoredTheme);
  };
}

function setTheme(theme: AppTheme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    window.localStorage.setItem(storageKey, theme);
  } catch {
    // The current page can still change theme when browser storage is unavailable.
  }
  window.dispatchEvent(new Event(themeChangeEvent));
}

export function useAppTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);
  return { theme, setTheme };
}
