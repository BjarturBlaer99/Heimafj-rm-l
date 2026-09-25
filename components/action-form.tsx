"use client";

import { useRef, useState, useTransition } from "react";
import { unstable_rethrow, useRouter } from "next/navigation";
import { useActionFeedback } from "@/components/action-feedback";
import type { ActionFeedback } from "@/lib/action-feedback";

type Props = Omit<React.ComponentProps<"form">, "action" | "onSubmit" | "onReset"> & {
  action: (formData: FormData) => Promise<ActionFeedback>;
  resetOnSuccess?: boolean;
};

export function ActionForm({ action, resetOnSuccess = false, children, ...props }: Props) {
  const router = useRouter();
  const notify = useActionFeedback();
  const formRef = useRef<HTMLFormElement>(null);
  const submitting = useRef(false);
  const allowReset = useRef(false);
  const [saving, setSaving] = useState(false);
  const [transitioning, startTransition] = useTransition();
  const pending = saving || transitioning;

  async function submit(formData: FormData) {
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    try {
      const result = await action(formData);
      if (!result) return;
      if (result.error) {
        notify(result.error, "error");
        return;
      }
      if (resetOnSuccess) {
        allowReset.current = true;
        try { formRef.current?.reset(); } finally { allowReset.current = false; }
      }
      notify(result.message);
      if (result.redirectTo) router.push(result.redirectTo, { scroll: false });
    } catch (error) {
      unstable_rethrow(error);
      notify("Ekki tókst að staðfesta hvort breytingin var vistuð. Athugaðu hvort hún sé komin inn áður en þú reynir aftur.", "error");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <form
      {...props}
      ref={formRef}
      action={submit}
      aria-busy={pending}
      // A queued pre-hydration action must also retain input on failure.
      onReset={(event) => { if (!allowReset.current) event.preventDefault(); }}
      onSubmit={(event) => {
        event.preventDefault();
        if (submitting.current) return;
        const form = event.currentTarget;
        const formData = new FormData(form, (event.nativeEvent as SubmitEvent).submitter);
        startTransition(() => submit(formData));
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
    </form>
  );
}
