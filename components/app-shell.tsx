import { LogOut } from "lucide-react";
import { DesktopNav, MobileNav } from "@/components/app-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "@/lib/actions";

export function AppShell({ children, email }: { children: React.ReactNode; email?: string }) {
  return (
    <div className="min-h-screen bg-paper">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-line/10 bg-surface md:block">
        <div className="flex h-20 items-center justify-between gap-3 px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-moss text-lg font-bold text-paper">kr</div>
            <div>
              <p className="text-sm font-semibold text-ink/55">Mín</p>
              <p className="font-bold">Fjármál</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <DesktopNav />

        <div className="absolute bottom-0 left-0 right-0 border-t border-line/10 p-4">
          <p className="truncate text-xs text-ink/50">{email}</p>
          <form action={signOut}>
            <button className="focus-ring mt-3 flex h-10 w-full items-center gap-2 rounded-md px-3 text-sm font-semibold text-ink/60 hover:bg-muted hover:text-ink">
              <LogOut size={17} />
              Skrá út
            </button>
          </form>
        </div>
      </aside>

      <MobileNav />

      <main className="min-w-0 pb-24 md:ml-64 md:pb-0">
        <div className="mx-auto min-w-0 max-w-7xl px-3 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="mb-4 flex justify-end md:hidden">
            <ThemeToggle />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
