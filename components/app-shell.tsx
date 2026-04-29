import Link from "next/link";
import { BarChart3, Goal, LayoutDashboard, LogOut, ReceiptText, Settings, TrendingDown, TrendingUp } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "@/lib/actions";

const nav = [
  { href: "/dashboard", label: "Yfirlit", icon: LayoutDashboard },
  { href: "/income", label: "Tekjur", icon: TrendingUp },
  { href: "/transactions", label: "Færslur", icon: ReceiptText },
  { href: "/expenses", label: "Útgjöld", icon: TrendingDown },
  { href: "/savings-goals", label: "Sparnaður", icon: Goal },
  { href: "/analytics", label: "Greining", icon: BarChart3 },
  { href: "/settings", label: "Stillingar", icon: Settings }
];

export function AppShell({ children, email }: { children: React.ReactNode; email?: string }) {
  return (
    <div className="min-h-screen bg-paper">
      <aside className="fixed inset-x-0 bottom-0 z-20 border-t border-line/10 bg-surface md:inset-y-0 md:left-0 md:right-auto md:w-64 md:border-r md:border-t-0">
        <div className="hidden h-20 items-center justify-between gap-3 px-6 md:flex">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-moss text-lg font-bold text-paper">kr</div>
            <div>
              <p className="text-sm font-semibold text-ink/55">Mín</p>
              <p className="font-bold">Fjármál</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
        <nav className="grid grid-cols-7 gap-1 p-2 md:block md:space-y-1 md:px-4">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="focus-ring flex h-12 items-center justify-center gap-3 rounded-md text-xs font-semibold text-ink/65 transition hover:bg-mint hover:text-ink md:w-full md:justify-start md:px-3 md:text-sm"
                title={item.label}
              >
                <Icon size={19} />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="hidden border-t border-line/10 p-4 md:absolute md:bottom-0 md:left-0 md:right-0 md:block">
          <p className="truncate text-xs text-ink/50">{email}</p>
          <form action={signOut}>
            <button className="focus-ring mt-3 flex h-10 w-full items-center gap-2 rounded-md px-3 text-sm font-semibold text-ink/60 hover:bg-muted hover:text-ink">
              <LogOut size={17} />
              Skrá út
            </button>
          </form>
        </div>
      </aside>
      <main className="pb-24 md:ml-64 md:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-4 flex justify-end md:hidden">
            <ThemeToggle />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
