"use client";

import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { GithubLogoIcon } from "@phosphor-icons/react/dist/csr/GithubLogo";
import Link from "next/link";

export type FooterDemoView = "overview" | "transactions" | "bills" | "savings" | "realEstate" | "markets" | "analytics";

const productLinks: Array<{ label: string; href: string; view: FooterDemoView }> = [
  { label: "Yfirlit", href: "/dashboard", view: "overview" },
  { label: "Færslur", href: "/transactions", view: "transactions" },
  { label: "Reikningar", href: "/bills", view: "bills" },
  { label: "Sparnaður", href: "/savings-goals", view: "savings" },
  { label: "Fasteignir", href: "/real-estate", view: "realEstate" },
  { label: "Markaðir", href: "/markets", view: "markets" }
];

export function AppFooter({
  mode = "app",
  onDemoNavigate,
  showProductLinks = true,
  reserveMobileNavSpace = false
}: {
  mode?: "app" | "demo" | "auth";
  onDemoNavigate?: (view: FooterDemoView) => void;
  showProductLinks?: boolean;
  reserveMobileNavSpace?: boolean;
}) {
  return (
    <footer
      data-scroll-reveal=""
      className={
        reserveMobileNavSpace
          ? "mt-auto border-t border-line/10 bg-surface pb-[calc(4.5rem+env(safe-area-inset-bottom))] text-ink lg:pb-0"
          : "mt-auto border-t border-line/10 bg-surface text-ink"
      }
    >
      <div className="mx-auto w-full max-w-[1440px] px-5 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
          <p className="text-[11px] leading-5 text-ink/45">© 2026 Bjartur Blær Gunnlaugsson</p>
          {showProductLinks ? (
            <nav aria-label="Valmynd í síðufæti" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              {productLinks.map((item) =>
                mode === "demo" && onDemoNavigate ? (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => onDemoNavigate(item.view)}
                    className="focus-ring rounded py-1 text-left font-medium text-ink/55 transition hover:text-accent"
                  >
                    {item.label}
                  </button>
                ) : (
                  <Link key={item.href} href={item.href} className="focus-ring rounded py-1 font-medium text-ink/55 transition hover:text-accent">
                    {item.label}
                  </Link>
                )
              )}
            </nav>
          ) : null}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <Link href="/help" className="focus-ring rounded py-1 font-medium text-ink/65 hover:text-accent">Aðstoð</Link>
            <Link href="/privacy" className="focus-ring rounded py-1 font-medium text-ink/65 hover:text-accent">Meðferð gagna</Link>
            <a
              href="https://github.com/BjarturBlaer99"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub síða Bjarts Blæs Gunnlaugssonar"
              className="focus-ring inline-flex items-center gap-1.5 rounded py-1 font-medium text-ink/55 transition hover:text-accent"
            >
              <GithubLogoIcon size={15} aria-hidden="true" />
              GitHub
            </a>
            <a
              href="https://github.com/BjarturBlaer99/Heimafj-rm-l"
              target="_blank"
              rel="noreferrer"
              className="focus-ring inline-flex items-center gap-1.5 rounded py-1 font-medium text-ink/55 transition hover:text-accent"
            >
              Verkefnið
              <ArrowSquareOutIcon size={12} aria-hidden="true" />
            </a>
          </div>
        </div>
        <p className="mt-3 border-t border-line/10 pt-3 text-[11px] leading-[1.7] text-ink/40">
          {mode === "demo" ? "Fjármálafærslur og notendagögn á þessari síðu eru tilbúin sýnigögn og breytingar vistast ekki. " : mode === "app" ? "Persónuleg gögn tilheyra innskráðum notanda og eru varin með aðgangsstýringu. " : ""}
          Markaðs- og fasteignaupplýsingar eru eingöngu til almennrar fræðslu og fela ekki í sér fjármálaráðgjöf.
        </p>
      </div>
    </footer>
  );
}
