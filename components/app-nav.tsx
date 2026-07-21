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
      <div className="hidden min-w-0 items-center justify-center gap-1 lg:flex">
        {nav.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "focus-ring inline-flex h-10 items-center border-b-2 px-2.5 text-[13px] font-semibold transition xl:px-3",
                active ? "border-ink text-ink" : "border-transparent text-ink/58 hover:border-line/15 hover:text-ink"
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
            "focus-ring grid h-9 w-9 place-items-center rounded-md border border-line/10 bg-surface text-ink/70 shadow-sm transition hover:bg-muted hover:text-ink",
            isActive(pathname, "/settings") && "bg-muted text-ink"
          )}
          title={email ? `Stillingar: ${email}` : "Stillingar"}
          aria-label="Stillingar"
        >
          <UserCircleIcon size={20} weight="duotone" />
        </Link>
        <button
          type="button"
          className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-md text-ink transition hover:bg-muted"
          aria-label="Opna valmynd"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <ListIcon size={22} weight="bold" />
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-y-auto bg-surface px-6 py-5 text-ink animate-rise lg:hidden">
          <div className="flex items-start justify-between gap-4">
            <Link href="/dashboard" className="focus-ring flex items-center rounded-md px-1 py-0.5 transition hover:text-moss" aria-label="Fara á yfirlit">
              <span className="text-lg font-bold leading-none">Mín fjármál</span>
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

          <div className="flex flex-1 flex-col items-center justify-center gap-5 py-10">
            {nav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "focus-ring rounded-md px-4 py-1 text-center text-3xl font-semibold leading-tight tracking-normal transition sm:text-5xl",
                    active ? "text-moss" : "text-ink hover:text-moss"
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
