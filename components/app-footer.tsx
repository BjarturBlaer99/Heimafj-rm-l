"use client";

import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { CodeIcon } from "@phosphor-icons/react/dist/csr/Code";
import { DatabaseIcon } from "@phosphor-icons/react/dist/csr/Database";
import { GithubLogoIcon } from "@phosphor-icons/react/dist/csr/GithubLogo";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/csr/ShieldCheck";
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
  mode?: "app" | "demo";
  onDemoNavigate?: (view: FooterDemoView) => void;
  showProductLinks?: boolean;
  reserveMobileNavSpace?: boolean;
}) {
  return (
    <footer
      className={
        reserveMobileNavSpace
          ? "mt-auto border-t border-line/10 bg-surface/55 pb-[calc(5rem+env(safe-area-inset-bottom))] text-ink lg:pb-0"
          : "mt-auto border-t border-line/10 bg-surface/55 text-ink"
      }
    >
      <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-5 lg:py-12">
        <div className={showProductLinks ? "grid gap-10 md:grid-cols-[1.25fr_0.75fr_1fr] lg:gap-14" : "grid gap-10 md:grid-cols-2 md:gap-16"}>
          <div className="max-w-md">
            <Link href={mode === "demo" ? "/" : "/dashboard"} className="focus-ring inline-flex rounded-md text-lg font-extrabold leading-none transition hover:opacity-75">
              Mín <span className="ml-1 text-accent">fjármál</span>
            </Link>
            <p className="mt-4 text-sm leading-6 text-ink/55">
              Persónulegt fjármálayfirlit sem sameinar tekjur, útgjöld, sparnað og markaðsgögn í skýra heildarmynd.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-ink/55">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-line/10 bg-paper/70 px-2.5 py-1.5">
                <CodeIcon size={15} weight="duotone" className="text-accent" />
                Next.js + TypeScript
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-line/10 bg-paper/70 px-2.5 py-1.5">
                <DatabaseIcon size={15} weight="duotone" className="text-lagoon" />
                Supabase
              </span>
            </div>
          </div>

          {showProductLinks ? (
            <nav aria-label="Footer valmynd">
              <p className="text-xs font-bold uppercase text-ink/40">Vefurinn</p>
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm md:grid-cols-1">
                {productLinks.map((item) =>
                  mode === "demo" && onDemoNavigate ? (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => onDemoNavigate(item.view)}
                      className="focus-ring w-fit rounded text-left font-semibold text-ink/60 transition hover:text-accent"
                    >
                      {item.label}
                    </button>
                  ) : (
                    <Link key={item.href} href={item.href} className="focus-ring w-fit rounded font-semibold text-ink/60 transition hover:text-accent">
                      {item.label}
                    </Link>
                  )
                )}
              </div>
            </nav>
          ) : null}

          <div>
            <p className="text-xs font-bold uppercase text-ink/40">Höfundur og samband</p>
            <p className="mt-4 font-bold">Bjartur Blær Gunnlaugsson</p>
            <p className="mt-1 text-sm text-ink/50">Hönnun og forritun</p>
            <div className="mt-5 grid gap-2">
              <a
                href="https://github.com/BjarturBlaer99"
                target="_blank"
                rel="noreferrer"
                className="focus-ring inline-flex w-fit items-center gap-2 rounded-md text-sm font-semibold text-ink/65 transition hover:text-accent"
              >
                <GithubLogoIcon size={19} weight="duotone" />
                @BjarturBlaer99
                <ArrowSquareOutIcon size={14} />
              </a>
              <a
                href="https://github.com/BjarturBlaer99/Heimafj-rm-l"
                target="_blank"
                rel="noreferrer"
                className="focus-ring inline-flex w-fit items-center gap-2 rounded-md text-sm font-semibold text-ink/65 transition hover:text-accent"
              >
                <CodeIcon size={19} weight="duotone" />
                Skoða verkefnið
                <ArrowSquareOutIcon size={14} />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-3 border-y border-line/10 py-5 text-xs leading-5 text-ink/50 sm:grid-cols-[auto_1fr] sm:items-start sm:gap-4">
          <span className="inline-flex w-fit items-center gap-2 rounded-md bg-accent/10 px-2.5 py-1 font-bold text-accent">
            <ShieldCheckIcon size={16} weight="duotone" />
            {mode === "demo" ? "Um sýnigögnin" : "Persónuvernd og fyrirvari"}
          </span>
          <p>
            {mode === "demo" ? "Fjármálafærslur og notendagögn á þessari síðu eru tilbúin sýnigögn og breytingar vistast ekki. " : "Persónuleg gögn tilheyra innskráðum notanda og eru varin með aðgangsstýringu. "}
            Markaðs- og fasteignaupplýsingar eru eingöngu til almennrar fræðslu og fela ekki í sér fjármálaráðgjöf.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 text-xs text-ink/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Bjartur Blær Gunnlaugsson. Allur réttur áskilinn.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>Byggt á Íslandi</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-moss" />
              Verkefni í virkri þróun
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
