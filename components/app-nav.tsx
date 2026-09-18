"use client";

import clsx from "clsx";
import { CalendarDotsIcon } from "@phosphor-icons/react/dist/csr/CalendarDots";
import { ChartDonutIcon } from "@phosphor-icons/react/dist/csr/ChartDonut";
import { ChartLineUpIcon } from "@phosphor-icons/react/dist/csr/ChartLineUp";
import { DotsThreeCircleIcon } from "@phosphor-icons/react/dist/csr/DotsThreeCircle";
import { GearSixIcon } from "@phosphor-icons/react/dist/csr/GearSix";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react/dist/csr/GlobeHemisphereWest";
import { HouseIcon } from "@phosphor-icons/react/dist/csr/House";
import { HouseLineIcon } from "@phosphor-icons/react/dist/csr/HouseLine";
import { InvoiceIcon } from "@phosphor-icons/react/dist/csr/Invoice";
import { PiggyBankIcon } from "@phosphor-icons/react/dist/csr/PiggyBank";
import { ReceiptIcon } from "@phosphor-icons/react/dist/csr/Receipt";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { TrendUpIcon } from "@phosphor-icons/react/dist/csr/TrendUp";
import { UserCircleIcon } from "@phosphor-icons/react/dist/csr/UserCircle";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { NavigationLink } from "@/components/navigation-link";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = {
  href: string;
  label: string;
  icon: typeof HouseIcon;
};

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  { label: "Yfirsýn", items: [
    { href: "/dashboard", label: "Yfirlit", icon: HouseIcon },
    { href: "/monthly-overview", label: "Mánuðir", icon: CalendarDotsIcon }
  ] },
  { label: "Fjármál", items: [
    { href: "/income", label: "Tekjur", icon: TrendUpIcon },
    { href: "/transactions", label: "Færslur", icon: ReceiptIcon },
    { href: "/expenses", label: "Útgjöld", icon: ChartDonutIcon },
    { href: "/bills", label: "Reikningar", icon: InvoiceIcon }
  ] },
  { label: "Eignir og sparnaður", items: [
    { href: "/savings-goals", label: "Sparnaður", icon: PiggyBankIcon },
    { href: "/real-estate", label: "Fasteignir", icon: HouseLineIcon }
  ] },
  { label: "Greining", items: [
    { href: "/markets", label: "Markaðir", icon: GlobeHemisphereWestIcon },
    { href: "/analytics", label: "Greining", icon: ChartLineUpIcon }
  ] }
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
  { href: "/real-estate", label: "Fasteignir", icon: HouseLineIcon },
  { href: "/markets", label: "Markaðir", icon: GlobeHemisphereWestIcon },
  { href: "/analytics", label: "Greining", icon: ChartLineUpIcon },
  { href: "/settings", label: "Stillingar", icon: GearSixIcon }
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopSidebar({ email }: { email?: string }) {
  const pathname = usePathname();
  const accountInitial = email?.trim().charAt(0).toUpperCase();

  return (
    <aside className="fade-in app-sidebar fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col lg:flex">
      <div className="flex h-[72px] shrink-0 items-center px-6">
        <NavigationLink href="/dashboard" aria-label="Mín fjármál — fara á yfirlit" className="focus-ring flex items-center gap-3 rounded-lg">
          <BrandMark />
          <span className="product-wordmark text-[21px]">Mín fjármál</span>
        </NavigationLink>
      </div>
      <nav aria-label="Aðalvalmynd" className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5">
        {navGroups.map((group, index) => (
          <div key={group.label} role="group" aria-labelledby={`sidebar-group-${index}`}>
            <p id={`sidebar-group-${index}`} className="sidebar-section-label mb-2 px-3">{group.label}</p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <NavigationLink
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={clsx("sidebar-link focus-ring", active && "sidebar-link-active")}
                  >
                    <Icon aria-hidden="true" size={19} weight={active ? "fill" : "regular"} className="shrink-0" />
                    <span className="min-w-0 break-words">{item.label}</span>
                  </NavigationLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-line/10 px-4 py-4">
        <NavigationLink
          href="/settings"
          aria-current={isActive(pathname, "/settings") ? "page" : undefined}
          className={clsx("sidebar-link focus-ring", isActive(pathname, "/settings") && "sidebar-link-active")}
        >
          <GearSixIcon aria-hidden="true" size={19} />
          <span>Stillingar</span>
        </NavigationLink>
        <div className="mt-3 flex min-w-0 items-center gap-3 px-3">
          <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line/10 bg-surface text-xs font-semibold">
            {accountInitial || <UserCircleIcon size={20} />}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink/80">Minn aðgangur</p>
            <p className="mt-0.5 truncate text-[11px] text-ink/60" title={email}>{email || "Persónuleg fjármál"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function TopNav({ email }: { email?: string }) {
  const pathname = usePathname();
  const currentRoute = navGroups.flatMap((group) => group.items).find((item) => isActive(pathname, item.href));
  const extraLabels: Record<string, string> = {
    "/settings": "Stillingar",
    "/budgets": "Fjárhagsáætlun",
    "/import": "Innflutningur",
    "/debt-payments": "Lánagreiðslur"
  };
  const routeLabel = currentRoute?.label ?? extraLabels[pathname] ?? "Yfirlit";

  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <NavigationLink href="/dashboard" aria-label="Fara á yfirlit" className="focus-ring shrink-0 rounded-lg lg:hidden">
          <BrandMark />
        </NavigationLink>
        <div className="flex min-w-0 items-center gap-3 text-[13px]">
          <span className="hidden text-ink/55 sm:inline">Persónuleg fjármál</span>
          <span className="hidden text-ink/30 sm:inline" aria-hidden="true">/</span>
          <p className="truncate font-medium text-ink/90">{routeLabel}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <form action="/transactions" className="mr-2 hidden items-center gap-2 rounded-md border border-line/10 bg-surface px-3 focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/15 xl:flex" role="search">
          <MagnifyingGlassIcon size={16} aria-hidden="true" className="text-ink/45" />
          <input type="search" name="search" aria-label="Leita í færslum" placeholder="Leita í færslum…" className="h-9 w-40 border-0 bg-transparent text-[12px] outline-none placeholder:text-ink/45" />
        </form>
        <ThemeToggle compact className="border-transparent bg-transparent shadow-none hover:border-line/10" />
        <span aria-hidden="true" className="h-6 w-px bg-line/10" />
        <NavigationLink
          href="/settings"
          aria-current={isActive(pathname, "/settings") ? "page" : undefined}
          className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-full lg:h-9 lg:w-9 border border-line/10 bg-muted/70 text-sm font-semibold text-ink/65 transition-colors hover:border-accent/25 hover:text-accent"
          title={email ? `Stillingar: ${email}` : "Stillingar"}
          aria-label="Stillingar"
        >
          {email?.trim().charAt(0).toUpperCase() || <UserCircleIcon aria-hidden="true" size={20} />}
        </NavigationLink>
      </div>
    </div>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(true);
  const moreActive = moreNav.some((item) => isActive(pathname, item.href));

  useEffect(() => {
    restoreFocus.current = false;
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      const controls = Array.from(dialog?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]') ?? [])
        .filter((element) => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) return;
      const outsideDialog = !dialog?.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || outsideDialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || outsideDialog)) {
        event.preventDefault();
        first.focus();
      }
    }

    const desktop = window.matchMedia("(min-width: 1024px)");
    function handleViewportChange() {
      if (desktop.matches) {
        restoreFocus.current = false;
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    desktop.addEventListener("change", handleViewportChange);
    handleViewportChange();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      desktop.removeEventListener("change", handleViewportChange);
      if (restoreFocus.current) trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <nav
        aria-label="Aðalvalmynd"
        className="fade-in fixed inset-x-0 bottom-0 z-40 border-t border-line/10 bg-surface/95 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid h-[68px] max-w-md grid-cols-5 gap-1 px-2 py-1.5">
          {mobileNav.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <NavigationLink
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "focus-ring flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-medium transition-colors",
                  active ? "text-accent" : "text-ink/50 hover:bg-muted/70 hover:text-ink"
                )}
              >
                <span className={clsx("grid h-7 w-10 place-items-center rounded-lg", active && "bg-accent/10")}>
                  <Icon aria-hidden="true" size={21} weight={active ? "fill" : "regular"} />
                </span>
                <span className="w-full truncate text-center">{item.label}</span>
              </NavigationLink>
            );
          })}
          <button
            ref={triggerRef}
            type="button"
            className={clsx(
              "focus-ring flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-medium transition-colors",
              open || moreActive ? "text-accent" : "text-ink/50 hover:bg-muted/70 hover:text-ink"
            )}
            aria-label="Opna fleiri síður"
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-controls="mobile-more-menu"
            onClick={() => {
              restoreFocus.current = true;
              setOpen(true);
            }}
          >
            <span className={clsx("grid h-7 w-10 place-items-center rounded-lg", (open || moreActive) && "bg-accent/10")}>
              <DotsThreeCircleIcon aria-hidden="true" size={21} weight={open || moreActive ? "fill" : "regular"} />
            </span>
            <span>Meira</span>
          </button>
        </div>
      </nav>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="fade-in-quick absolute inset-0 h-full w-full bg-ink/30 backdrop-blur-[2px]"
            aria-label="Loka valmynd"
            tabIndex={-1}
            onClick={() => setOpen(false)}
          />
          <div
            ref={dialogRef}
            id="mobile-more-menu"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-more-title"
            className="fade-in-quick absolute inset-x-0 bottom-0 mx-auto max-h-[80dvh] max-w-lg overflow-y-auto rounded-t-2xl border-t border-line/10 bg-surface px-5 pb-5 pt-3 text-ink"
            style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line/20" />
            <div className="flex items-center justify-between gap-4 py-3">
              <div>
                <p id="mobile-more-title" className="text-base font-semibold">Fleiri síður</p>
                <p className="mt-1 text-xs text-ink/50">Yfirsýn og stillingar</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-full lg:h-9 lg:w-9 border border-line/10 text-ink/60 transition-colors hover:bg-muted hover:text-ink"
                aria-label="Loka valmynd"
                onClick={() => setOpen(false)}
              >
                <XIcon aria-hidden="true" size={18} />
              </button>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              {moreNav.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <NavigationLink
                    key={item.href}
                    href={item.href}
                    onNavigate={() => {
                      restoreFocus.current = false;
                      setOpen(false);
                    }}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "focus-ring flex min-h-16 min-w-0 items-center gap-3 rounded-lg border px-3 py-3 text-[13px] font-medium transition-colors",
                      active
                        ? "border-accent/25 bg-accent/10 text-accent"
                        : "border-line/10 bg-surface text-ink/75 hover:border-accent/20 hover:bg-muted/60"
                    )}
                  >
                    <Icon aria-hidden="true" size={21} weight={active ? "fill" : "regular"} className="shrink-0" />
                    <span className="min-w-0 break-words">{item.label}</span>
                  </NavigationLink>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
