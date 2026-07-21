import { UserCircleIcon } from "@phosphor-icons/react/dist/ssr/UserCircle";
import Link from "next/link";
import { TopNav } from "@/components/app-nav";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppShell({ children, email }: { children: React.ReactNode; email?: string }) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="header-enter sticky top-0 z-30 bg-paper/90 px-3 py-3 backdrop-blur-xl sm:px-5">
        <div className="mx-auto flex min-h-[60px] max-w-[1200px] items-center gap-3 rounded-lg border border-line/10 bg-surface/90 px-3 py-2 shadow-soft sm:px-4">
          <Link href="/dashboard" className="focus-ring flex min-w-0 shrink-0 items-center rounded-md px-1 py-1 transition hover:opacity-80" aria-label="Fara á yfirlit">
            <span className="whitespace-nowrap text-base font-extrabold leading-none">Mín <span className="text-accent">fjármál</span></span>
          </Link>

          <TopNav email={email} />

          <div className="ml-auto hidden shrink-0 items-center gap-2 lg:flex">
            <ThemeToggle compact />
            <Link
              href="/settings"
              className="focus-ring grid h-10 w-10 place-items-center rounded-md border border-line/15 bg-surface/80 text-ink/65 shadow-sm transition hover:border-accent/30 hover:bg-muted hover:text-accent"
              title={email ? `Stillingar: ${email}` : "Stillingar"}
              aria-label="Stillingar"
            >
              <UserCircleIcon size={20} weight="duotone" />
            </Link>
          </div>
        </div>
      </header>

      <main className="min-w-0">
        <div className="page-enter mx-auto min-w-0 max-w-[1200px] px-3 py-5 sm:px-5 sm:py-7">{children}</div>
      </main>
    </div>
  );
}
