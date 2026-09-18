"use client";

import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { CalendarDotsIcon } from "@phosphor-icons/react/dist/csr/CalendarDots";
import { ChartDonutIcon } from "@phosphor-icons/react/dist/csr/ChartDonut";
import { ChartLineUpIcon } from "@phosphor-icons/react/dist/csr/ChartLineUp";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
import { DotsThreeCircleIcon } from "@phosphor-icons/react/dist/csr/DotsThreeCircle";
import { HouseIcon } from "@phosphor-icons/react/dist/csr/House";
import { HouseLineIcon } from "@phosphor-icons/react/dist/csr/HouseLine";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react/dist/csr/GlobeHemisphereWest";
import { InvoiceIcon } from "@phosphor-icons/react/dist/csr/Invoice";
import { PiggyBankIcon } from "@phosphor-icons/react/dist/csr/PiggyBank";
import { ReceiptIcon } from "@phosphor-icons/react/dist/csr/Receipt";
import { TrendUpIcon } from "@phosphor-icons/react/dist/csr/TrendUp";
import { UserCircleIcon } from "@phosphor-icons/react/dist/csr/UserCircle";
import { UserPlusIcon } from "@phosphor-icons/react/dist/csr/UserPlus";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { motion, MotionConfig } from "motion/react";
import Link from "next/link";
import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DashboardOverview } from "@/components/dashboard-overview";
import { demoDashboardData, demoDisplayTransactions, demoMonth } from "@/components/demo-dashboard-data";
import { AppFooter } from "@/components/app-footer";
import { BrandMark } from "@/components/brand-mark";
import { CategoryBars, PieBreakdown, TrendChart } from "@/components/charts";
import { ThemeToggle } from "@/components/theme-toggle";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { AnimatedProgress } from "@/components/ui/animated-progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  demoBills,
  demoCategories,
  demoSavings,
  demoSummary,
  demoTrend,
  type DemoTransaction
} from "@/lib/demo-data";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

type DemoView = "overview" | "transactions" | "bills" | "savings" | "realEstate" | "markets" | "analytics";
type TransactionFilter = "all" | DemoTransaction["kind"];

const views = [
  { id: "overview" as const, label: "Yfirlit", icon: HouseIcon },
  { id: "transactions" as const, label: "Færslur", icon: ReceiptIcon },
  { id: "bills" as const, label: "Reikningar", icon: InvoiceIcon },
  { id: "savings" as const, label: "Sparnaður", icon: PiggyBankIcon },
  { id: "realEstate" as const, label: "Fasteignir", icon: HouseLineIcon },
  { id: "markets" as const, label: "Markaðir", icon: GlobeHemisphereWestIcon },
  { id: "analytics" as const, label: "Greining", icon: ChartLineUpIcon }
];

const mobilePrimaryViews = views.filter((view) => ["overview", "transactions", "bills", "savings"].includes(view.id));
const mobileMoreViews = views.filter((view) => ["realEstate", "markets", "analytics"].includes(view.id));

const transactionFilters: Array<{ id: TransactionFilter; label: string }> = [
  { id: "all", label: "Allar" },
  { id: "income", label: "Tekjur" },
  { id: "expense", label: "Útgjöld" },
  { id: "saving", label: "Sparnaður" }
];

function ViewHeading({ title, description, period }: { title: string; description: string; period?: string }) {
  return (
    <header data-scroll-reveal="" className="mb-6 flex flex-wrap items-center justify-between gap-4 sm:mb-7">
      <div>
        <h1 className="page-heading">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/55">{description}</p>
      </div>
      {period ? (
        <span className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-line/15 bg-surface px-3.5 py-2.5 text-xs font-semibold text-ink/70">
          <CalendarDotsIcon size={16} className="text-ink/45" />
          {period}
        </span>
      ) : null}
    </header>
  );
}

function Overview({ onNavigate, marketContent }: { onNavigate: (view: DemoView, transactionHref?: string) => void; marketContent: ReactNode }) {
  const router = useRouter();
  function followDashboardLink(href: string) {
    const path = href.split(/[?#]/)[0];
    if (href.includes("#new-transaction") || href.includes("#import-transactions")) { router.push("/signup"); return; }
    if (path.startsWith("/transactions")) { onNavigate("transactions", href); return; }
    if (path === "/income") { onNavigate("transactions", "/transactions?type=income"); return; }
    if (path === "/bills") { onNavigate("bills"); return; }
    if (path === "/savings-goals") { onNavigate("savings"); return; }
    if (path === "/markets") { onNavigate("markets"); return; }
    onNavigate("analytics");
  }
  return <DashboardOverview data={demoDashboardData} month={demoMonth} today="2026-06-18" onNavigate={followDashboardLink} marketContent={marketContent} />;
}

function Transactions({ initialHref }: { initialHref?: string }) {
  const target = new URL(initialHref ?? "/transactions", "https://demo.invalid");
  const selectedId = target.searchParams.get("id");
  const category = target.pathname.startsWith("/transactions/category/") ? decodeURIComponent(target.pathname.split("/").at(-1) ?? "") : null;
  const selectedRow = useRef<HTMLDivElement>(null);
  useEffect(() => { if (selectedId) selectedRow.current?.focus(); }, [selectedId]);
  const [filter, setFilter] = useState<TransactionFilter>(target.searchParams.get("type") === "income" ? "income" : target.searchParams.get("type") === "expense" ? "expense" : "all");
  const visibleTransactions = demoDisplayTransactions.filter((transaction) => (filter === "all" || transaction.kind === filter) && (!category || transaction.category === category));

  return (
    <>
      <ViewHeading title="Færslur" description={`${visibleTransactions.length} sýnifærslur í ${demoSummary.month.toLowerCase()}${category ? ` · ${category}` : ""}`} />
      <p className="mb-4 text-xs leading-relaxed text-ink/65">Færslur merktar „Aðrar færslur“ taka saman fleiri sýniútgjöld í sama flokki. <Link href="/signup" className="text-accent underline underline-offset-2">Stofnaðu aðgang til að skrá eigin færslur.</Link></p>
      <div className="fade-in mb-4 flex max-w-full gap-1 overflow-x-auto rounded-md border border-line/10 bg-muted/45 p-1 sm:w-fit">
        {transactionFilters.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setFilter(item.id)}
            aria-pressed={filter === item.id}
            className={cn("relative shrink-0 overflow-hidden bg-transparent px-3 hover:bg-transparent", filter === item.id ? "text-ink" : "text-ink/55 hover:text-ink")}
          >
            {filter === item.id ? <motion.span layoutId="transaction-filter" className="absolute inset-0 rounded-md bg-surface shadow-sm" transition={{ type: "spring", stiffness: 430, damping: 34 }} /> : null}
            <span className="relative z-10">{item.label}</span>
          </Button>
        ))}
      </div>
      <Card className="overflow-hidden p-0 sm:p-0">
        <div className="divide-y divide-line/10">
          {visibleTransactions.map((transaction) => (
            <div key={transaction.id} id={`transaction-${transaction.id}`} ref={transaction.id === selectedId ? selectedRow : undefined} tabIndex={transaction.id === selectedId ? -1 : undefined} className="scroll-mt-24 focus:outline-none focus:bg-accent/5 flex min-w-0 flex-col items-start gap-2 px-4 py-3.5 min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between min-[400px]:gap-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-md", transaction.kind === "income" ? "bg-moss/10 text-moss" : transaction.kind === "saving" ? "bg-accent/10 text-accent" : "bg-coral/10 text-coral")}>
                  {transaction.kind === "income" ? <TrendUpIcon size={19} weight="duotone" /> : transaction.kind === "saving" ? <PiggyBankIcon size={19} weight="duotone" /> : <ReceiptIcon size={19} weight="duotone" />}
                </div>
                <div className="min-w-0">
                  <p className="break-words font-semibold">{transaction.merchant}</p>
                  <p className="truncate text-xs text-ink/50">{transaction.category} · {transaction.date}</p>
                </div>
              </div>
              <p className={cn("shrink-0 text-sm font-bold sm:text-base", transaction.kind === "income" ? "text-moss" : transaction.kind === "saving" ? "text-accent" : "text-coral")}>
                {transaction.kind === "income" ? "+" : "-"}{money(transaction.amount)}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function Bills() {
  const paidTotal = demoBills.filter((bill) => bill.paid).reduce((sum, bill) => sum + bill.amount, 0);
  const unpaidTotal = demoBills.filter((bill) => !bill.paid).reduce((sum, bill) => sum + bill.amount, 0);

  return (
    <>
      <ViewHeading title="Reikningar" description="Greiðslur mánaðarins og það sem er fram undan." period={demoSummary.month} />
      <div className="reveal-group mb-5 grid gap-3 sm:grid-cols-2">
        <Card>
          <p className="text-sm font-semibold text-ink/55">Greitt</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-ink"><AnimatedNumber value={paidTotal} format={money} /></p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-ink/55">Ógreitt</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-ink"><AnimatedNumber value={unpaidTotal} format={money} /></p>
        </Card>
      </div>
      <Card className="overflow-hidden p-0 sm:p-0">
        <div className="divide-y divide-line/10">
          {demoBills.map((bill) => (
            <div key={bill.id} className="flex min-w-0 items-center justify-between gap-3 px-4 py-4 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-md", bill.paid ? "bg-moss/10 text-moss" : "bg-gold/10 text-gold")}>
                  {bill.paid ? <CheckCircleIcon size={20} weight="fill" /> : <ClockIcon size={20} weight="duotone" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{bill.name}</p>
                  <p className="text-xs text-ink/50">Gjalddagi {bill.due}</p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-bold">{money(bill.amount)}</p>
                <p className={cn("text-xs font-semibold", bill.paid ? "text-moss" : "text-gold")}>{bill.paid ? "Greitt" : "Ógreitt"}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function Savings() {
  const totalSaved = demoSavings.reduce((sum, saving) => sum + saving.current, 0);

  return (
    <>
      <ViewHeading title="Sparnaður" description="Markmið og nýjustu innborganir" />
      <Card className="mb-5 border-accent/20 bg-accent/5">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-accent/10 text-accent">
            <PiggyBankIcon size={23} weight="duotone" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-ink/55">Heildarsparnaður</h2>
            <p className="text-2xl font-bold"><AnimatedNumber value={totalSaved} format={money} /></p>
          </div>
        </div>
      </Card>
      <h2 className="mb-4 font-semibold">Sparnaðarmarkmið</h2>
      <div className="reveal-group grid gap-4 lg:grid-cols-2">
        {demoSavings.map((saving) => {
          const progress = (saving.current / saving.target) * 100;
          return (
            <Card key={saving.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">{saving.name}</h3>
                  <p className="mt-1 text-sm text-ink/50">Markmið {money(saving.target)}</p>
                </div>
                <Badge variant="neutral">{Math.round(progress)}%</Badge>
              </div>
              <p className="mt-6 text-2xl font-bold">{money(saving.current)}</p>
              <div className="mt-3"><AnimatedProgress value={progress} /></div>
              <p className="mt-4 text-sm text-ink/55">Síðast bætt við <span className="font-bold text-ink">{money(saving.lastAdded)}</span></p>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function Analytics() {
  return (
    <>
      <ViewHeading title="Greining" description="Þróun og dreifing útgjalda" />
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <ChartLineUpIcon size={20} className="text-accent" weight="duotone" />
          <h2 className="font-bold">Mánaðarleg þróun</h2>
        </div>
        <TrendChart data={demoTrend} height={300} />
      </Card>
      <div className="reveal-group mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <ChartDonutIcon size={20} className="text-accent" weight="duotone" />
            <h2 className="font-bold">Flokkar</h2>
          </div>
          <PieBreakdown data={demoCategories} />
        </Card>
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <CalendarDotsIcon size={20} className="text-accent" weight="duotone" />
            <h2 className="font-bold">Samanburður</h2>
          </div>
          <CategoryBars data={demoCategories.slice(0, 5)} />
        </Card>
      </div>
    </>
  );
}

// Menu state changes should not rerender the active section's charts and widgets.
const DemoViewContent = memo(function DemoViewContent({
  view,
  onNavigate,
  marketContent,
  marketSummary,
  realEstateContent,
  transactionHref
}: {
  view: DemoView;
  onNavigate: (view: DemoView, transactionHref?: string) => void;
  marketContent: ReactNode;
  marketSummary: ReactNode;
  transactionHref?: string;
  realEstateContent: ReactNode;
}) {
  switch (view) {
    case "overview": return <Overview onNavigate={onNavigate} marketContent={marketSummary} />;
    case "transactions": return <Transactions initialHref={transactionHref} />;
    case "bills": return <Bills />;
    case "savings": return <Savings />;
    case "realEstate": return <><ViewHeading title="Fasteignir" description="Markaðsgögn, lánareiknivél og eignir til skoðunar" />{realEstateContent}</>;
    case "markets": return <><ViewHeading title="Markaðir" description="Hlutabréf, sjóðir, gengi og íslenska hagkerfið" />{marketContent}</>;
    case "analytics": return <Analytics />;
  }
});

export function DemoApp({ marketContent, marketSummary, realEstateContent, initialView = "overview" }: { marketContent: ReactNode; marketSummary: ReactNode; realEstateContent: ReactNode; initialView?: DemoView }) {
  const [transactionHref, setTransactionHref] = useState<string | undefined>();
  const [view, setView] = useState<DemoView>(initialView);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const moreDialogRef = useRef<HTMLDivElement>(null);
  const moreCloseRef = useRef<HTMLButtonElement>(null);
  const restoreMoreFocus = useRef(true);
  const currentView = views.find((item) => item.id === view)!;

  useEffect(() => {
    if (!moreOpen) return;
    const trigger = moreTriggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    moreCloseRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMoreOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = moreDialogRef.current;
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
        restoreMoreFocus.current = false;
        setMoreOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    desktop.addEventListener("change", handleViewportChange);
    handleViewportChange();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      desktop.removeEventListener("change", handleViewportChange);
      if (restoreMoreFocus.current) trigger?.focus();
    };
  }, [moreOpen]);

  const navigate = useCallback((nextView: DemoView, targetHref?: string) => {
    setTransactionHref(targetHref);
    setMoreOpen(false);
    setView(nextView);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={280}>
        <div className="flex min-h-screen flex-col bg-paper text-ink lg:pl-[232px]">
      <aside className="fade-in app-sidebar fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col overflow-y-auto px-4 py-6 lg:flex">
        <button
          type="button"
          onClick={() => navigate("overview")}
          className="focus-ring flex shrink-0 items-center gap-3 rounded-lg px-3 text-left"
          aria-label="Mín fjármál — fara á yfirlit"
        >
          <BrandMark />
          <span className="product-wordmark text-[21px]">Mín fjármál</span>
        </button>

        <nav className="mt-10 shrink-0 space-y-8" aria-label="Sýningarvalmynd">
          {[
            { label: "Fjármál", items: mobilePrimaryViews },
            { label: "Markaðir og greining", items: mobileMoreViews }
          ].map((group) => (
            <div key={group.label}>
              <p className="sidebar-section-label mb-3 px-3">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = view === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(item.id)}
                      aria-current={active ? "page" : undefined}
                      className={cn("sidebar-link focus-ring flex w-full items-center gap-3 px-3 py-2.5 text-left", active && "sidebar-link-active")}
                    >
                      <Icon size={20} className="shrink-0" weight={active ? "fill" : "regular"} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto shrink-0 border-t border-line/10 pt-4">
          <Link href="/login" className="sidebar-link focus-ring flex items-center gap-3 px-3 py-2.5">
            <UserCircleIcon size={20} />
            <span>Innskráning</span>
          </Link>
          <p className="mt-5 px-3 text-[11px] text-ink/55">© 2026 Mín fjármál</p>
        </div>
      </aside>

      <header className="fade-in workspace-topbar sticky top-0 z-30 w-full">
        <div className="flex min-h-[72px] w-full min-w-0 items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate("overview")}
            className="focus-ring flex shrink-0 items-center gap-2.5 rounded-lg lg:hidden"
            aria-label="Fara á yfirlit"
          >
            <BrandMark className="h-8 w-8" />
            <span className="whitespace-nowrap text-sm font-bold tracking-tight">Mín fjármál</span>
          </button>

          <div className="hidden items-center gap-3 text-sm lg:flex" aria-label="Núverandi hluti">
            <span className="text-ink/40">Mín fjármál</span>
            <span className="text-ink/25" aria-hidden="true">/</span>
            <span className="font-semibold text-ink/75">{currentView.label}</span>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
            <ThemeToggle compact />
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/login"
                  className="focus-ring inline-flex h-11 w-11 lg:h-9 items-center justify-center rounded-lg text-sm font-semibold text-ink/60 transition-colors hover:bg-muted hover:text-ink sm:w-auto sm:gap-2 sm:px-2.5"
                  aria-label="Innskráning"
                >
                  <UserCircleIcon size={19} weight="duotone" />
                  <span className="hidden md:inline">Innskráning</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent className="md:hidden">Innskráning</TooltipContent>
            </Tooltip>
            <Button asChild className="h-11 w-11 lg:h-9 px-0 sm:w-auto sm:px-3.5">
              <Link href="/signup" aria-label="Stofna aðgang">
                <UserPlusIcon className="sm:hidden" size={18} weight="duotone" />
                <span className="hidden sm:inline">Stofna aðgang</span>
                <ArrowRightIcon className="hidden sm:block" size={16} />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content" className="app-workspace workspace-content mx-auto w-full min-w-0 max-w-[1360px] flex-1 px-4 pb-10 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-12">
        <div className="fade-in mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-accent/10 bg-accent/[0.035] px-3.5 py-2.5 text-xs">
          <span className="inline-flex items-center gap-2 font-semibold text-accent"><span className="h-1.5 w-1.5 rounded-full bg-accent" />Sýningarútgáfa</span>
          <span className="text-ink/50">Tilbúin fjármálagögn fyrir júní 2026 · engin tenging við bankareikning.</span>
        </div>

        <DemoViewContent key={view + (transactionHref ?? "")} view={view} onNavigate={navigate} transactionHref={transactionHref} marketContent={marketContent} marketSummary={marketSummary} realEstateContent={realEstateContent} />
      </main>

      <AppFooter mode="demo" onDemoNavigate={navigate} reserveMobileNavSpace />

      <nav
        className="fade-in fixed inset-x-0 bottom-0 z-40 border-t border-line/15 bg-surface lg:hidden"
        aria-label="Sýningarvalmynd"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid h-[60px] max-w-md grid-cols-5 px-1 sm:h-16 sm:px-2">
          {mobilePrimaryViews.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <motion.button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                aria-current={active ? "page" : undefined}
                whileTap={{ scale: 0.94 }}
                className={cn("focus-ring relative flex min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-md px-1 text-[10px] font-semibold transition", active ? "text-accent" : "text-ink/50 hover:text-ink")}
              >
                {active ? <motion.span layoutId="mobile-nav-active" className="absolute inset-x-1.5 inset-y-1 rounded-md bg-accent/10" transition={{ type: "spring", stiffness: 430, damping: 34 }} /> : null}
                <Icon className="relative z-10" size={22} weight={active ? "fill" : "regular"} />
                <span className="relative z-10 w-full truncate text-center">{item.label}</span>
              </motion.button>
            );
          })}
          <motion.button
            ref={moreTriggerRef}
            type="button"
            onClick={() => {
              restoreMoreFocus.current = true;
              setMoreOpen(true);
            }}
            aria-current={moreOpen || mobileMoreViews.some((item) => item.id === view) ? "page" : undefined}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            aria-controls="demo-mobile-more-menu"
            whileTap={{ scale: 0.94 }}
            className={cn(
              "focus-ring relative flex min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-md px-1 text-[10px] font-semibold transition",
              moreOpen || mobileMoreViews.some((item) => item.id === view) ? "text-accent" : "text-ink/50 hover:text-ink"
            )}
          >
            {moreOpen || mobileMoreViews.some((item) => item.id === view) ? <span className="absolute inset-x-1.5 inset-y-1 rounded-md bg-accent/10" /> : null}
            <DotsThreeCircleIcon className="relative z-10" size={22} weight={moreOpen || mobileMoreViews.some((item) => item.id === view) ? "fill" : "regular"} />
            <span className="relative z-10">Meira</span>
          </motion.button>
        </div>
      </nav>

        {moreOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button type="button" className="fade-in-quick absolute inset-0 h-full w-full bg-black/35 backdrop-blur-[2px]" aria-label="Loka valmynd" tabIndex={-1} onClick={() => setMoreOpen(false)} />
            <div
              ref={moreDialogRef}
              id="demo-mobile-more-menu"
              role="dialog"
              aria-modal="true"
              aria-labelledby="demo-mobile-more-title"
              className="fade-in-quick absolute inset-x-0 bottom-0 mx-auto max-h-[80dvh] max-w-lg overflow-y-auto rounded-t-lg border-t border-line/10 bg-surface px-4 pb-5 pt-3 text-ink shadow-[0_-16px_40px_rgba(var(--shadow-soft)/0.16)]"
              style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
            >
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line/20" />
              <div className="flex items-center justify-between gap-4 py-2">
                <div>
                  <h2 id="demo-mobile-more-title" className="text-lg font-bold">Meira</h2>
                  <p className="text-xs text-ink/50">Fleiri hlutar sýningarútgáfunnar</p>
                </div>
                <button ref={moreCloseRef} type="button" className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-md text-ink/60 transition hover:bg-muted hover:text-ink" aria-label="Loka valmynd" onClick={() => setMoreOpen(false)}>
                  <XIcon size={22} weight="bold" />
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {mobileMoreViews.map((item) => {
                  const Icon = item.icon;
                  const active = view === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(item.id)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "focus-ring flex min-h-16 min-w-0 items-center gap-3 rounded-md border px-3 py-3 text-left text-sm font-semibold transition",
                        active ? "border-accent/25 bg-accent/10 text-accent" : "border-line/10 bg-muted/35 text-ink hover:border-accent/20 hover:bg-muted"
                      )}
                    >
                      <Icon className="shrink-0" size={22} weight={active ? "fill" : "duotone"} />
                      <span className="min-w-0 break-words">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
        </div>
      </TooltipProvider>
    </MotionConfig>
  );
}
