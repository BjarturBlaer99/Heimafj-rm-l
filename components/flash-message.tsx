"use client";

import { useEffect } from "react";
import { useActionFeedback } from "@/components/action-feedback";

const messages: Record<string, { tone: "success" | "error"; text: string }> = {
  imported: { tone: "success", text: "Færslurnar voru fluttar inn." },
  imported_partial: { tone: "success", text: "Nýjar færslur voru fluttar inn og tvíteknum færslum sleppt." },
  imported_duplicates: { tone: "success", text: "Engar nýjar færslur fundust. Tvíteknum færslum var sleppt." },
  bill_saved: { tone: "success", text: "Reikningurinn var vistaður fyrir valinn mánuð." },
  bill_paid: { tone: "success", text: "Reikningurinn var merktur greiddur og útgjaldafærsla var búin til." },
  bill_deleted_month: { tone: "success", text: "Reikningnum var eytt úr völdum mánuði." },
  bill_deleted_all: { tone: "success", text: "Reikningnum var eytt úr öllum mánuðum." },
  savings_added: { tone: "success", text: "Upphæðinni var bætt við sparnaðinn." }
};

export function FlashMessage({ code, imported, skipped }: { code?: string; imported?: string; skipped?: string }) {
  const notify = useActionFeedback();
  useEffect(() => {
    // Let the router install its history integration on initial hydration.
    const timer = window.setTimeout(() => {
      const message = code ? messages[code] : null;
      const url = new URL(window.location.href);
      if (!message || url.searchParams.get("success") !== code) return;
      const count = (value?: string) => Math.max(0, Number(value) || 0).toLocaleString("is-IS");
      const details = imported || skipped ? ` (${count(imported)} fluttar inn, ${count(skipped)} sleppt)` : "";
      notify(message.text + details, message.tone);
      // Consume only the notification parameters; retain filters and scroll.
      ["success", "imported", "skipped"].forEach((key) => url.searchParams.delete(key));
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [code, imported, skipped, notify]);
  return null;
}
