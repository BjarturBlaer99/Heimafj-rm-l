"use client";

import clsx from "clsx";
import { Menu, UserCircle, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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
    <nav className="ml-auto min-w-0 flex-1 lg:ml-4">
      <div className="hidden min-w-0 items-center justify-center gap-1 lg:flex">
        {nav.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "focus-ring inline-flex h-10 items-center rounded-md px-3 text-sm font-semibold transition xl:px-4",
                active ? "bg-mint text-ink" : "text-ink/65 hover:bg-mint hover:text-ink"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-2 lg:hidden">
        <Link
          href="/settings"
          className={clsx(
            "focus-ring grid h-10 w-10 place-items-center rounded-full border border-line/10 bg-muted text-ink/70 transition hover:bg-mint hover:text-ink",
            isActive(pathname, "/settings") && "bg-mint text-ink"
          )}
          title={email ? `Stillingar: ${email}` : "Stillingar"}
          aria-label="Stillingar"
        >
          <UserCircle size={22} />
        </Link>
        <button
          type="button"
          className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md text-ink transition hover:bg-muted"
          aria-label="Opna valmynd"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Menu size={24} />
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-y-auto bg-paper px-6 py-5 text-ink animate-rise lg:hidden">
          <div className="flex items-start justify-between gap-4">
            <Link href="/dashboard" className="focus-ring flex items-center rounded-md px-1 py-0.5 transition hover:text-moss" aria-label="Fara á yfirlit">
              <div>
                <p className="text-sm font-semibold text-ink/55">Mín</p>
                <p className="text-lg font-bold leading-tight">Fjármál</p>
              </div>
            </Link>
            <button
              type="button"
              className="focus-ring inline-flex h-12 w-12 items-center justify-center rounded-md text-ink transition hover:bg-muted"
              aria-label="Loka valmynd"
              onClick={() => setOpen(false)}
            >
              <X size={36} strokeWidth={2.2} />
            </button>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-6 py-10">
            {nav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "focus-ring rounded-md px-4 py-1 text-center text-4xl font-bold leading-tight tracking-normal transition sm:text-5xl",
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
