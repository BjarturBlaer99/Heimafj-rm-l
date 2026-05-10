import { UserCircle } from "lucide-react";
import Link from "next/link";
import { TopNav } from "@/components/app-nav";

export function AppShell({ children, email }: { children: React.ReactNode; email?: string }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-30 border-b border-line/10 bg-surface shadow-soft">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-3 py-2 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="focus-ring flex min-w-0 shrink-0 items-center rounded-md px-1 py-0.5 transition hover:text-moss" aria-label="Fara á yfirlit">
            <div>
              <p className="text-xs font-semibold text-ink/55">Mín</p>
              <p className="font-bold leading-tight">Fjármál</p>
            </div>
          </Link>

          <TopNav email={email} />

          <div className="ml-auto hidden shrink-0 items-center gap-2 lg:flex">
            <Link
              href="/settings"
              className="focus-ring grid h-10 w-10 place-items-center rounded-full border border-line/10 bg-muted text-ink/70 transition hover:bg-mint hover:text-ink"
              title={email ? `Stillingar: ${email}` : "Stillingar"}
              aria-label="Stillingar"
            >
              <UserCircle size={22} />
            </Link>
          </div>
        </div>
      </header>

      <main className="min-w-0">
        <div className="mx-auto min-w-0 max-w-7xl px-3 py-5 sm:px-6 sm:py-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
