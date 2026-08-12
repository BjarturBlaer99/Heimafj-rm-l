import { UserCircleIcon } from "@phosphor-icons/react/dist/ssr/UserCircle";
import Link from "next/link";
import { MobileBottomNav, TopNav } from "@/components/app-nav";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppShell({ children, email }: { children: React.ReactNode; email?: string }) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="header-enter sticky top-0 z-30 bg-paper/90 px-2 py-2 backdrop-blur-xl sm:px-5 sm:py-3">
        <div className="mx-auto flex min-h-14 max-w-[1200px] items-center gap-2 rounded-lg border border-line/10 bg-surface/90 px-2.5 py-2 shadow-soft sm:min-h-[60px] sm:gap-3 sm:px-4">
          <Link href="/dashboard" className="focus-ring flex min-w-0 shrink-0 items-center rounded-md px-1 py-1 transition hover:opacity-80" aria-label="Fara á yfirlit">
            <span className="whitespace-nowrap text-[15px] font-extrabold leading-none sm:text-base">Mín <span className="text-accent">fjármál</span></span>
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

      <main className="min-w-0 pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:pb-0">
        <div className="app-workspace page-enter mx-auto min-w-0 max-w-[1200px] px-3 py-4 sm:px-5 sm:py-7">{children}</div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
