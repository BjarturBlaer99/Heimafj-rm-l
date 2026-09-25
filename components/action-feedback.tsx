"use client";

import { CheckCircleIcon } from "@phosphor-icons/react/CheckCircle";
import { WarningCircleIcon } from "@phosphor-icons/react/WarningCircle";
import { XIcon } from "@phosphor-icons/react/X";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type Notice = { id: number; message: string; tone: "success" | "error" };
const FeedbackContext = createContext<((message: string, tone?: Notice["tone"]) => void) | null>(null);

export function useActionFeedback() {
  const notify = useContext(FeedbackContext);
  if (!notify) throw new Error("Action feedback requires ActionFeedbackProvider");
  return notify;
}

function Notification({ notice, dismiss }: { notice: Notice; dismiss: () => void }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || notice.tone === "error") return;
    const timer = window.setTimeout(dismiss, 8000);
    return () => window.clearTimeout(timer);
  }, [dismiss, notice, paused]);

  const success = notice.tone === "success";
  const Icon = success ? CheckCircleIcon : WarningCircleIcon;
  return (
    <div
      className={`fade-in-quick pointer-events-auto flex items-start gap-3 rounded-xl border bg-surface p-3 shadow-soft ${success ? "border-moss/30" : "border-coral/30"}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
    >
      <span className={`mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full ${success ? "bg-moss/10 text-moss" : "bg-coral/10 text-coral"}`}>
        <Icon size={22} weight="duotone" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 py-1" data-feedback-tone={notice.tone}>
        <p className="text-sm font-semibold text-ink">{success ? "Það tókst" : "Eitthvað fór úrskeiðis"}</p>
        <p className="mt-0.5 break-words text-sm leading-relaxed text-ink/70">{notice.message}</p>
      </div>
      <button type="button" aria-label="Loka skilaboðum" onClick={dismiss} className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink/50 transition-colors hover:bg-muted hover:text-ink">
        <XIcon size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

export function ActionFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const sequence = useRef(0);
  const notify = useCallback((message: string, tone: Notice["tone"] = "success") => {
    setNotice({ id: ++sequence.current, message, tone });
  }, []);
  const dismiss = useCallback(() => setNotice(null), []);

  return (
    <FeedbackContext.Provider value={notify}>
      {children}
      <div className="sr-only" role="status" aria-atomic="true">{notice?.tone === "success" ? <span key={notice.id}>{notice.message}</span> : null}</div>
      <div className="sr-only" role="alert" aria-atomic="true">{notice?.tone === "error" ? <span key={notice.id}>{notice.message}</span> : null}</div>
      <div className="pointer-events-none fixed inset-x-4 top-[calc(5.25rem+env(safe-area-inset-top))] z-[70] sm:left-auto sm:w-[380px] lg:bottom-6 lg:right-6 lg:top-auto">
        {notice ? <Notification key={notice.id} notice={notice} dismiss={dismiss} /> : null}
      </div>
    </FeedbackContext.Provider>
  );
}
