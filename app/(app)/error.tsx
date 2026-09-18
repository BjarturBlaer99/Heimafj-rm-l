"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui";

export default function FinanceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <section className="mx-auto my-10 max-w-xl rounded-2xl border border-line/15 bg-surface p-6 sm:p-10" role="alert">
    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink/50">Gögn ekki tiltæk</p>
    <h1 className="font-serif text-3xl">Ekki tókst að sækja yfirlitið.</h1>
    <p className="my-4 leading-7 text-ink/65">Ekki er hægt að staðfesta tölurnar núna. Það þýðir ekki að staðan sé núll eða að gögn vanti á aðganginn.</p>
    <Button disabled={pending} onClick={() => startTransition(() => { router.refresh(); reset(); })}>{pending ? "Reyni aftur…" : "Reyna aftur"}</Button>
  </section>;
}
