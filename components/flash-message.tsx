const messages: Record<string, { tone: "success" | "error"; text: string }> = {
  imported: { tone: "success", text: "Færslurnar voru fluttar inn." },
  bill_paid: { tone: "success", text: "Reikningurinn var merktur greiddur og útgjaldafærsla var búin til." },
  savings_added: { tone: "success", text: "Sparnaðarupphæðin var bætt við." }
};

export function FlashMessage({ code }: { code?: string }) {
  const message = code ? messages[code] : null;
  if (!message) return null;

  const className =
    message.tone === "success"
      ? "mb-5 rounded-lg border border-moss/20 bg-mint/70 px-4 py-3 text-sm font-semibold text-ink"
      : "mb-5 rounded-lg border border-coral/20 bg-coral/10 px-4 py-3 text-sm font-semibold text-coral";

  return <div className={className}>{message.text}</div>;
}
