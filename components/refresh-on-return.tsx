"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function RefreshOnReturn() {
  const router = useRouter();

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    function scheduleRefresh() {
      if (document.visibilityState !== "visible") return;
      if (refreshTimer !== null) clearTimeout(refreshTimer);
      // Returning to a tab can emit both focus and visibilitychange together.
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        if (document.visibilityState === "visible") router.refresh();
      }, 100);
    }

    function restorePage(event: PageTransitionEvent) {
      if (event.persisted) scheduleRefresh();
    }

    window.addEventListener("focus", scheduleRefresh);
    document.addEventListener("visibilitychange", scheduleRefresh);
    window.addEventListener("pageshow", restorePage);

    return () => {
      if (refreshTimer !== null) clearTimeout(refreshTimer);
      window.removeEventListener("focus", scheduleRefresh);
      document.removeEventListener("visibilitychange", scheduleRefresh);
      window.removeEventListener("pageshow", restorePage);
    };
  }, [router]);

  return null;
}
