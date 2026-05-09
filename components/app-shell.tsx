import Link from "next/link";
import { BarChart3, CalendarDays, FileText, Goal, LayoutDashboard, LogOut, Menu, ReceiptText, Settings, TrendingDown, TrendingUp } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "@/lib/actions";

const nav = [
  { href: "/dashboard", label: "Yfirlit", icon: LayoutDashboard },
  { href: "/monthly-overview", label: "Mánuðir", icon: CalendarDays },
  { href: "/income", label: "Tekjur", icon: TrendingUp },
  { href: "/transactions", label: "Færslur", icon: ReceiptText },
  { href: "/expenses", label: "Útgjöld", icon: TrendingDown },
  { href: "/bills", label: "Reikningar", icon: FileText },
  { href: "/savings-goals", label: "Sparnaður", icon: Goal },
  { href: "/analytics", label: "Greining", icon: BarChart3 },
  { href: "/settings", label: "Stillingar", icon: Settings }
];

const mobilePrimaryNav = [nav[0], nav[1], nav[3], nav[5]];
const mobileMoreNav = [nav[2], nav[4], nav[6], nav[7], nav[8]];

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
        <nav className="space-y-1 px-4">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="focus-ring flex h-12 w-full items-center justify-start gap-3 rounded-md px-3 text-sm font-semibold text-ink/65 transition hover:bg-mint hover:text-ink"
                title={item.label}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
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

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line/10 bg-surface px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-soft md:hidden">
        <div className="grid grid-cols-5 gap-1">
          {mobilePrimaryNav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="focus-ring flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-semibold leading-none text-ink/70 transition hover:bg-mint hover:text-ink"
              >
                <Icon size={19} />
                <span className="max-w-full truncate px-1">{item.label}</span>
              </Link>
            );
          })}
          <details className="group">
            <summary className="focus-ring flex h-14 cursor-pointer list-none flex-col items-center justify-center gap-1 rounded-md text-[11px] font-semibold leading-none text-ink/70 transition hover:bg-mint hover:text-ink [&::-webkit-details-marker]:hidden">
              <Menu size={19} />
              <span>Meira</span>
            </summary>
            <div className="fixed inset-x-3 bottom-20 z-40 rounded-lg border border-line/10 bg-surface p-2 shadow-soft">
              <div className="grid gap-1">
                {mobileMoreNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="focus-ring flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-ink/70 transition hover:bg-mint hover:text-ink"
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </details>
        </div>
      </nav>

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
