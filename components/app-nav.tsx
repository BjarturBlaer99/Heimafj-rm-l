"use client";

import clsx from "clsx";
import { BarChart3, CalendarDays, FileText, Goal, LayoutDashboard, Menu, ReceiptText, Settings, TrendingDown, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const nav: NavItem[] = [
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

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1 px-4">
      {nav.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "focus-ring flex h-12 w-full items-center justify-start gap-3 rounded-md px-3 text-sm font-semibold transition",
              active ? "bg-mint text-ink" : "text-ink/65 hover:bg-mint hover:text-ink"
            )}
            title={item.label}
          >
            <Icon size={19} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const moreActive = mobileMoreNav.some((item) => isActive(pathname, item.href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line/10 bg-surface px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-soft md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {mobilePrimaryNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "focus-ring flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-semibold leading-none transition",
                active ? "bg-mint text-ink" : "text-ink/70 hover:bg-mint hover:text-ink"
              )}
            >
              <Icon size={19} />
              <span className="max-w-full truncate px-1">{item.label}</span>
            </Link>
          );
        })}
        <details className="group">
          <summary
            className={clsx(
              "focus-ring flex h-14 cursor-pointer list-none flex-col items-center justify-center gap-1 rounded-md text-[11px] font-semibold leading-none transition [&::-webkit-details-marker]:hidden",
              moreActive ? "bg-mint text-ink" : "text-ink/70 hover:bg-mint hover:text-ink"
            )}
          >
            <Menu size={19} />
            <span>Meira</span>
          </summary>
          <div className="fixed inset-x-3 bottom-20 z-40 rounded-lg border border-line/10 bg-surface p-2 shadow-soft">
            <div className="grid gap-1">
              {mobileMoreNav.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "focus-ring flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition",
                      active ? "bg-mint text-ink" : "text-ink/70 hover:bg-mint hover:text-ink"
                    )}
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
  );
}
