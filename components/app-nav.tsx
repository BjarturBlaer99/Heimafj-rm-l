"use client";

import clsx from "clsx";
import { ListIcon } from "@phosphor-icons/react/dist/csr/List";
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

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNav({ email }: { email?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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
        <button
          type="button"
          className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-line/15 bg-surface/80 text-ink transition hover:border-accent/30 hover:bg-muted hover:text-accent"
          aria-label="Opna valmynd"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <ListIcon size={22} weight="bold" />
        </button>
      </div>

      {open ? (
        <div className="menu-enter fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-y-auto bg-paper px-6 py-5 text-ink lg:hidden">
          <div className="flex items-start justify-between gap-4">
            <Link href="/dashboard" className="focus-ring flex items-center rounded-md px-1 py-1 transition hover:opacity-80" aria-label="Fara á yfirlit">
              <span className="whitespace-nowrap text-lg font-extrabold leading-none">Mín <span className="text-accent">fjármál</span></span>
            </Link>
            <button
              type="button"
              className="focus-ring inline-flex h-12 w-12 items-center justify-center rounded-md text-ink transition hover:bg-muted"
              aria-label="Loka valmynd"
              onClick={() => setOpen(false)}
            >
              <XIcon size={34} weight="regular" />
            </button>
          </div>

          <div className="stagger-children flex flex-1 flex-col items-center justify-center gap-5 py-10">
            {nav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "focus-ring rounded-md px-4 py-1 text-center text-3xl font-semibold leading-tight tracking-normal transition sm:text-5xl",
                    active ? "text-accent" : "text-ink hover:text-accent"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </nav>
  );
}
