"use client";

import { useRef, useState } from "react";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui";
import { addSavingsBucketAmount } from "@/lib/actions";

function copyForm(source: FormData) {
  const copy = new FormData();
  for (const [key, value] of source) copy.append(key, value);
  return copy;
}

export function SavingsContributionForm({ children, className }: { children: React.ReactNode; className?: string }) {
  // Allocate on submission so server rendering never generates a different ID
  // from hydration. Keep it after uncertain errors: a lost response must not add twice.
  const submission = useRef<FormData | null>(null);
  const [needsRetry, setNeedsRetry] = useState(false);
  async function contribute(form: FormData) {
    if (!submission.current) {
      submission.current = copyForm(form);
      submission.current.set("request_id", crypto.randomUUID());
    }
    try {
      const feedback = await addSavingsBucketAmount(copyForm(submission.current));
      // Structured feedback errors are validation failures before the write.
      // Both these and confirmed success let the user make a fresh submission.
      submission.current = null;
      setNeedsRetry(false);
      return feedback;
    } catch (error) {
      // The database may already have committed. Retry the exact snapshot so
      // edits or disabled fields cannot turn its retained UUID into a new payment.
      setNeedsRetry(true);
      throw error;
    }
  }
  return <ActionForm action={contribute} resetOnSuccess className={className}>
    <fieldset disabled={needsRetry} className="contents">{children}</fieldset>
    {needsRetry ? <div className="space-y-3 sm:col-span-2">
      <p role="status" className="text-sm leading-relaxed text-ink/70">Ekki náðist að staðfesta vistunina. Reitirnir eru læstir á meðan við endurtökum sömu beiðni með sömu upphæð og dagsetningu. Framlagið bætist ekki við tvisvar.</p>
      <Button type="submit" variant="secondary">Reyna sömu vistun aftur</Button>
    </div> : null}
  </ActionForm>;
}
