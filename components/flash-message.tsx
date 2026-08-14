const messages: Record<string, { tone: "success" | "error"; text: string }> = {
  imported: { tone: "success", text: "Færslurnar voru fluttar inn." },
  imported_partial: { tone: "success", text: "Nýjar færslur voru fluttar inn og duplicate færslum var sleppt." },
  imported_duplicates: { tone: "success", text: "Engar nýjar færslur fundust. Duplicate færslum var sleppt." },
  bill_saved: { tone: "success", text: "Reikningurinn var vistaður fyrir valinn mánuð." },
  bill_paid: { tone: "success", text: "Reikningurinn var merktur greiddur og útgjaldafærsla var búin til." },
  bill_deleted_month: { tone: "success", text: "Reikningnum var eytt úr völdum mánuði." },
  bill_deleted_all: { tone: "success", text: "Sama reikningi var eytt úr öllum mánuðum." },
  savings_added: { tone: "success", text: "Sparnaðarupphæðin var bætt við." }
};

export function FlashMessage({ code, imported, skipped }: { code?: string; imported?: string; skipped?: string }) {
  const message = code ? messages[code] : null;
  if (!message) return null;
  const details =
    imported || skipped
      ? ` (${Number(imported ?? 0).toLocaleString("is-IS")} fluttar inn, ${Number(skipped ?? 0).toLocaleString("is-IS")} sleppt)`
      : "";

  const className =
    message.tone === "success"
      ? "mb-5 rounded-lg border border-moss/20 bg-moss/10 px-4 py-3 text-sm font-semibold text-moss"
      : "mb-5 rounded-lg border border-coral/20 bg-coral/10 px-4 py-3 text-sm font-semibold text-coral";

  return <div className={className}>{message.text}{details}</div>;
}
