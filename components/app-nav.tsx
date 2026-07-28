"use client";

import clsx from "clsx";
import { CalendarDotsIcon } from "@phosphor-icons/react/dist/csr/CalendarDots";
import { ChartDonutIcon } from "@phosphor-icons/react/dist/csr/ChartDonut";
import { ChartLineUpIcon } from "@phosphor-icons/react/dist/csr/ChartLineUp";
import { DotsThreeCircleIcon } from "@phosphor-icons/react/dist/csr/DotsThreeCircle";
import { GearSixIcon } from "@phosphor-icons/react/dist/csr/GearSix";
import { HouseIcon } from "@phosphor-icons/react/dist/csr/House";
import { InvoiceIcon } from "@phosphor-icons/react/dist/csr/Invoice";
import { PiggyBankIcon } from "@phosphor-icons/react/dist/csr/PiggyBank";
import { ReceiptIcon } from "@phosphor-icons/react/dist/csr/Receipt";
import { TrendUpIcon } from "@phosphor-icons/react/dist/csr/TrendUp";
import { UserCircleIcon } from "@phosphor-icons/react/dist/csr/UserCircle";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = {
  href: string;
  label: string;
};

const nav: NavItem[] = [
  { href: "/dashboard", label: "Yfirlit" },
  { href: "/monthly-overview", label: "Mánuðir" },
  { href: "/income", label: "Tekjur" },
  { href: "/transactions", label: "Færslur" },
  { href: "/expenses", label: "Útgjöld" },
  { href: "/bills", label: "Reikningar" },
  { href: "/savings-goals", label: "Sparnaður" },
  { href: "/analytics", label: "Greining" }
];

const mobileNav = [
  { href: "/dashboard", label: "Yfirlit", icon: HouseIcon },
  { href: "/monthly-overview", label: "Mánuðir", icon: CalendarDotsIcon },
  { href: "/transactions", label: "Færslur", icon: ReceiptIcon },
  { href: "/expenses", label: "Útgjöld", icon: ChartDonutIcon }
];

const moreNav = [
  { href: "/income", label: "Tekjur", icon: TrendUpIcon },
  { href: "/bills", label: "Reikningar", icon: InvoiceIcon },
  { href: "/savings-goals", label: "Sparnaður", icon: PiggyBankIcon },
  { href: "/analytics", label: "Greining", icon: ChartLineUpIcon },
  { href: "/settings", label: "Stillingar", icon: GearSixIcon }
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNav({ email }: { email?: string }) {
  const pathname = usePathname();

  return (
    <nav className="ml-auto min-w-0 flex-1 lg:ml-5">
      <div className="mx-auto hidden w-fit min-w-0 items-center justify-center gap-0.5 lg:flex">
        {nav.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "focus-ring inline-flex h-9 items-center rounded-md px-2.5 text-[13px] font-semibold transition xl:px-3",
                active ? "bg-accent/10 text-accent" : "text-ink/55 hover:bg-muted/70 hover:text-ink"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-2 lg:hidden">
        <ThemeToggle compact />
        <Link
          href="/settings"
          className={clsx(
            "focus-ring grid h-10 w-10 place-items-center rounded-md border border-line/15 bg-surface/80 text-ink/70 shadow-sm transition hover:border-accent/30 hover:bg-muted hover:text-accent",
            isActive(pathname, "/settings") && "border-accent/30 bg-muted text-accent"
          )}
          title={email ? `Stillingar: ${email}` : "Stillingar"}
          aria-label="Stillingar"
        >
          <UserCircleIcon size={20} weight="duotone" />
        </Link>
      </div>
    </nav>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const moreActive = moreNav.some((item) => isActive(pathname, item.href));

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <nav
        aria-label="Aðalvalmynd"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line/10 bg-surface/95 shadow-[0_-8px_24px_rgba(var(--shadow-soft)/0.08)] backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 px-2">
          {mobileNav.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "focus-ring flex min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-[10px] font-semibold transition",
                  active ? "text-accent" : "text-ink/50 hover:bg-muted/70 hover:text-ink"
                )}
              >
                <Icon size={22} weight={active ? "fill" : "regular"} />
                <span className="w-full truncate text-center">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            className={clsx(
              "focus-ring flex min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-[10px] font-semibold transition",
              open || moreActive ? "text-accent" : "text-ink/50 hover:bg-muted/70 hover:text-ink"
            )}
            aria-label="Opna fleiri síður"
            aria-expanded={open}
            aria-controls="mobile-more-menu"
            onClick={() => setOpen(true)}
          >
            <DotsThreeCircleIcon size={22} weight={open || moreActive ? "fill" : "regular"} />
            <span>Meira</span>
          </button>
        </div>
      </nav>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="menu-enter absolute inset-0 h-full w-full bg-black/35 backdrop-blur-[2px]"
            aria-label="Loka valmynd"
            onClick={() => setOpen(false)}
          />
          <div
            id="mobile-more-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Fleiri síður"
            className="sheet-enter absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-lg border-t border-line/10 bg-surface px-4 pb-5 pt-3 text-ink shadow-[0_-16px_40px_rgba(var(--shadow-soft)/0.16)]"
            style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line/20" />
            <div className="flex items-center justify-between gap-4 py-2">
              <div>
                <p className="text-lg font-bold">Meira</p>
                <p className="text-xs text-ink/50">Allar síður appsins</p>
              </div>
              <button
                type="button"
                className="focus-ring grid h-10 w-10 place-items-center rounded-md text-ink/60 transition hover:bg-muted hover:text-ink"
                aria-label="Loka valmynd"
                onClick={() => setOpen(false)}
              >
                <XIcon size={22} weight="bold" />
              </button>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              {moreNav.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "focus-ring flex min-h-16 items-center gap-3 rounded-md border px-3 py-3 text-sm font-semibold transition",
                      active
                        ? "border-accent/25 bg-accent/10 text-accent"
                        : "border-line/10 bg-muted/35 text-ink hover:border-accent/20 hover:bg-muted"
                    )}
                  >
                    <Icon size={22} weight={active ? "fill" : "duotone"} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
