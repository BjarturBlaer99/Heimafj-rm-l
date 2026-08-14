import { UserCircleIcon } from "@phosphor-icons/react/dist/ssr/UserCircle";
import Link from "next/link";
import { AppFooter } from "@/components/app-footer";
import { MobileBottomNav, TopNav } from "@/components/app-nav";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppShell({ children, email }: { children: React.ReactNode; email?: string }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="header-enter sticky top-0 z-30 w-full border-b border-line/10 bg-surface/90 shadow-[0_1px_0_rgba(var(--color-line)/0.03)] backdrop-blur-xl">
        <div className="flex min-h-14 w-full min-w-0 items-center gap-2 px-3 py-2 sm:min-h-16 sm:gap-3 sm:px-5 lg:px-6 xl:px-8">
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

      <main className="min-w-0 flex-1 pb-8 lg:pb-10">
        <div className="app-workspace page-enter mx-auto w-full min-w-0 max-w-[1440px] px-3 py-4 sm:px-5 sm:py-7 lg:px-6 xl:px-8">{children}</div>
      </main>
      <AppFooter reserveMobileNavSpace />
      <MobileBottomNav />
    </div>
  );
}
