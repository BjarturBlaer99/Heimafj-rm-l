"use client";

import { Button, Card } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-paper p-4">
      <Card className="max-w-md">
        <h1 className="text-xl font-bold">Eitthvað fór úrskeiðis</h1>
        <p className="mt-2 text-sm text-ink/60">{error.message}</p>
        <Button className="mt-4" onClick={reset}>
          Reyna aftur
        </Button>
      </Card>
    </main>
  );
}
