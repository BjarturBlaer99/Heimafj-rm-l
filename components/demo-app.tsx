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
import { TrendDownIcon } from "@phosphor-icons/react/dist/csr/TrendDown";
import { TrendUpIcon } from "@phosphor-icons/react/dist/csr/TrendUp";
import { UserCircleIcon } from "@phosphor-icons/react/dist/csr/UserCircle";
import { UserPlusIcon } from "@phosphor-icons/react/dist/csr/UserPlus";
import { WalletIcon } from "@phosphor-icons/react/dist/csr/Wallet";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { AnimatePresence, motion, MotionConfig, type Variants } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppFooter } from "@/components/app-footer";
import { CategoryBars, PieBreakdown, Sparkline, TrendChart } from "@/components/charts";
import { ChangeBadge, MarketOverview, StatusBadge } from "@/components/market-overview";
import { RealEstateOverview } from "@/components/real-estate-overview";
import { ThemeToggle } from "@/components/theme-toggle";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { AnimatedProgress } from "@/components/ui/animated-progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  demoBills,
  demoCategories,
  demoSavings,
  demoSummary,
  demoTransactions,
  demoTrend,
  type DemoTransaction
} from "@/lib/demo-data";
import { money } from "@/lib/format";
import type { MarketSnapshot } from "@/lib/market-data";
import type { RealEstateSnapshot } from "@/lib/real-estate-data";
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

const statGridVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.04,
      staggerChildren: 0.055
    }
  }
};

const statCardVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] }
  }
};

function ViewHeading({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-5 sm:mb-6">
      <h2 className="text-[1.65rem] font-bold leading-tight sm:text-3xl">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink/50">{description}</p>
    </header>
  );
}

function trendChange(data: Array<Record<string, string | number>>, dataKey: string) {
  const latest = Number(data.at(-1)?.[dataKey] ?? 0);
  const previous = Number(data.at(-2)?.[dataKey] ?? 0);
  if (!Number.isFinite(latest) || !Number.isFinite(previous) || previous === 0) return 0;
  return ((latest - previous) / Math.abs(previous)) * 100;
}

function Overview({ onNavigate, marketData }: { onNavigate: (view: DemoView) => void; marketData: MarketSnapshot }) {
  const monthBalanceTone = demoSummary.balance > 0 ? "text-moss" : demoSummary.balance < 0 ? "text-coral" : "text-ink";
  const monthBalanceColor = demoSummary.balance > 0
    ? "rgb(var(--color-moss))"
    : demoSummary.balance < 0
      ? "rgb(var(--color-coral))"
      : "rgb(var(--color-ink))";
  const balanceRate = demoSummary.income > 0 ? (demoSummary.balance / demoSummary.income) * 100 : 0;
  const stats = [
    { label: "Tekjur", value: demoSummary.income, format: money, tone: "text-moss", iconTone: "bg-moss/10 text-moss", color: "rgb(var(--color-moss))", icon: TrendUpIcon, view: "analytics" as const, key: "income", change: trendChange(demoTrend, "income"), inverse: false },
    { label: "Útgjöld", value: demoSummary.expenses, format: money, tone: "text-coral", iconTone: "bg-coral/10 text-coral", color: "rgb(var(--color-coral))", icon: TrendDownIcon, view: "analytics" as const, key: "expenses", change: trendChange(demoTrend, "expenses"), inverse: true },
    { label: "Eftir mánuðinn", value: demoSummary.balance, format: money, tone: monthBalanceTone, iconTone: demoSummary.balance > 0 ? "bg-moss/10 text-moss" : demoSummary.balance < 0 ? "bg-coral/10 text-coral" : "bg-muted text-ink", color: monthBalanceColor, icon: WalletIcon, view: "analytics" as const, key: "savings", change: trendChange(demoTrend, "savings"), inverse: false }
  ];

  return (
    <>
      <ViewHeading title="Yfirlit" description={demoSummary.month} />

      <motion.div className="grid gap-3 sm:grid-cols-3" variants={statGridVariants} initial="hidden" animate="visible">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              variants={statCardVariants}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.99 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              className="group h-full min-w-0"
            >
              <Card className="h-full min-h-[176px] overflow-hidden p-0 transition-colors duration-200 group-hover:border-accent/25">
                <button type="button" onClick={() => onNavigate(stat.view)} className="focus-ring flex h-full w-full flex-col p-4 text-left sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-md", stat.iconTone)}>
                        <Icon size={19} weight="duotone" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold leading-tight">{stat.label}</p>
                        <p className="mt-1 text-xs leading-snug text-ink/45">{demoSummary.month}</p>
                      </div>
                    </div>
                    <span className="sm:hidden lg:block"><StatusBadge status="sample" minimal /></span>
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <p className={cn("text-2xl font-bold leading-none", stat.tone)}>
                      <AnimatedNumber value={stat.value} format={stat.format} />
                    </p>
                    <span className="sm:hidden lg:block"><ChangeBadge value={stat.change} inverse={stat.inverse} /></span>
                  </div>
                  <div className="mt-auto pt-2">
                    <Sparkline data={demoTrend} dataKey={stat.key} color={stat.color} />
                    <p className="mt-1 text-[11px] text-ink/40">Síðustu sex mánuðir</p>
                  </div>
                </button>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="mt-5 grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.75fr)]">
        <Card className="h-full">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold">Tekjur, útgjöld og sparnaður</h3>
              <p className="mt-1 text-xs text-ink/50">Síðustu sex mánuðir</p>
            </div>
            <ChartLineUpIcon size={20} className="text-accent" weight="duotone" />
          </div>
          <TrendChart data={demoTrend} height={260} />
        </Card>

        <Card className="h-full">
          <div className="flex items-center gap-2">
            <CheckCircleIcon size={20} className={monthBalanceTone} weight="duotone" />
            <h3 className="font-bold">Mánaðarstaða</h3>
          </div>
          <p className={cn("mt-5 text-3xl font-bold", monthBalanceTone)}>
            {demoSummary.balance > 0 ? "Góð" : demoSummary.balance < 0 ? "Þarf athygli" : "Jafnvægi"}
          </p>
          <p className="mt-1 text-sm text-ink/55">{Math.round(balanceRate)}% af tekjum eru eftir.</p>
          <div className="mt-6 grid gap-4">
            <div>
              <div className="mb-1.5 flex justify-between text-xs font-semibold">
                <span>Sparnaðarhlutfall</span>
                <span>{Math.round(balanceRate)}%</span>
              </div>
              <AnimatedProgress value={Math.max(0, Math.min(balanceRate, 100))} />
            </div>
            <div>
              <div className="mb-1.5 flex justify-between text-xs font-semibold">
                <span>Reikningar greiddir</span>
                <span>3 af 5</span>
              </div>
              <AnimatedProgress value={60} />
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => onNavigate("savings")} className="motion-link mt-6 px-0 text-accent hover:bg-transparent hover:text-accent">
            Skoða sparnað
            <ArrowRightIcon size={16} />
          </Button>
        </Card>
      </div>

      <Card className="mt-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold">Útgjöld eftir flokkum</h3>
            <p className="mt-1 text-xs text-ink/50">{demoSummary.month}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => onNavigate("analytics")} className="text-accent hover:text-accent">
            Greining
          </Button>
        </div>
        <PieBreakdown data={demoCategories} />
      </Card>

      <div className="mt-7 border-t border-line/10 pt-7">
        <MarketOverview data={marketData} compact />
      </div>
    </>
  );
}

function Transactions() {
  const [filter, setFilter] = useState<TransactionFilter>("all");
  const visibleTransactions = demoTransactions.filter((transaction) => filter === "all" || transaction.kind === filter);

  return (
    <>
      <ViewHeading title="Færslur" description={`${demoSummary.transactionCount} færslur í ${demoSummary.month.toLowerCase()}`} />
      <div className="mb-4 flex max-w-full gap-1 overflow-x-auto rounded-md border border-line/10 bg-muted/45 p-1 sm:w-fit">
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
            <div key={transaction.id} className="flex min-w-0 items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-md", transaction.kind === "income" ? "bg-moss/10 text-moss" : transaction.kind === "saving" ? "bg-accent/10 text-accent" : "bg-coral/10 text-coral")}>
                  {transaction.kind === "income" ? <TrendUpIcon size={19} weight="duotone" /> : transaction.kind === "saving" ? <PiggyBankIcon size={19} weight="duotone" /> : <ReceiptIcon size={19} weight="duotone" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{transaction.merchant}</p>
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
      <ViewHeading title="Reikningar" description={demoSummary.month} />
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <Card>
          <p className="text-sm font-semibold text-ink/55">Greitt</p>
          <p className="mt-2 text-2xl font-bold text-moss"><AnimatedNumber value={paidTotal} format={money} /></p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-ink/55">Ógreitt</p>
          <p className="mt-2 text-2xl font-bold text-coral"><AnimatedNumber value={unpaidTotal} format={money} /></p>
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
            <p className="text-sm font-semibold text-ink/55">Heildarsparnaður</p>
            <p className="text-2xl font-bold"><AnimatedNumber value={totalSaved} format={money} /></p>
          </div>
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
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
          <h3 className="font-bold">Mánaðarleg þróun</h3>
        </div>
        <TrendChart data={demoTrend} height={300} />
      </Card>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <ChartDonutIcon size={20} className="text-accent" weight="duotone" />
            <h3 className="font-bold">Flokkar</h3>
          </div>
          <PieBreakdown data={demoCategories} />
        </Card>
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <CalendarDotsIcon size={20} className="text-accent" weight="duotone" />
            <h3 className="font-bold">Samanburður</h3>
          </div>
          <CategoryBars data={demoCategories.slice(0, 5)} />
        </Card>
      </div>
    </>
  );
}

function RealEstate({ data }: { data: RealEstateSnapshot }) {
  return (
    <>
      <ViewHeading title="Fasteignir" description="Markaðsgögn, lánareiknivél og eignir til skoðunar" />
      <RealEstateOverview data={data} />
    </>
  );
}

function Markets({ data }: { data: MarketSnapshot }) {
  return (
    <>
      <ViewHeading title="Markaðir" description="Hlutabréf, sjóðir, gengi og íslenska hagkerfið" />
      <MarketOverview data={data} />
    </>
  );
}

export function DemoApp({ marketData, realEstateData }: { marketData: MarketSnapshot; realEstateData: RealEstateSnapshot }) {
  const [view, setView] = useState<DemoView>("overview");
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = moreOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [moreOpen]);

  function navigate(nextView: DemoView) {
    setMoreOpen(false);
    setView(nextView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={280}>
        <div className="flex min-h-screen flex-col bg-paper text-ink">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 z-30 bg-paper/90 px-2 py-2 backdrop-blur-xl sm:px-5 sm:py-3"
      >
        <div className="mx-auto flex min-h-14 max-w-[1200px] items-center gap-2 rounded-lg border border-line/10 bg-surface/90 px-2.5 py-2 shadow-soft sm:min-h-[60px] sm:gap-3 sm:px-4">
          <button
            type="button"
            onClick={() => navigate("overview")}
            className="focus-ring flex shrink-0 items-center rounded-md px-1 py-1 transition hover:opacity-80"
            aria-label="Fara á yfirlit"
          >
            <span className="whitespace-nowrap text-[15px] font-extrabold leading-none sm:text-base">Mín <span className="text-accent">fjármál</span></span>
          </button>

          <nav className="mx-auto hidden items-center gap-0.5 lg:flex" aria-label="Sýningarvalmynd">
            {views.map((item) => {
              const active = view === item.id;
              return (
                <Button
                  key={item.id}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn("relative overflow-hidden bg-transparent hover:bg-transparent", active ? "text-accent" : "text-ink/55 hover:text-ink")}
                >
                  {active ? <motion.span layoutId="desktop-nav-active" className="absolute inset-0 rounded-md bg-accent/10" transition={{ type: "spring", stiffness: 430, damping: 34 }} /> : null}
                  <span className="relative z-10">{item.label}</span>
                </Button>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <ThemeToggle compact />
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/login"
                  className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-md border border-line/15 bg-surface text-sm font-bold text-ink/65 shadow-sm transition hover:-translate-y-px hover:border-accent/30 hover:bg-muted hover:text-ink sm:h-10 sm:w-auto sm:gap-2 sm:px-2.5"
                  aria-label="Innskráning"
                >
                  <UserCircleIcon size={19} weight="duotone" />
                  <span className="hidden md:inline">Innskráning</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent className="md:hidden">Innskráning</TooltipContent>
            </Tooltip>
            <Button asChild className="motion-link h-9 w-9 px-0 sm:h-10 sm:w-auto sm:px-3">
              <Link href="/signup" aria-label="Stofna aðgang">
                <UserPlusIcon className="sm:hidden" size={18} weight="duotone" />
                <span className="hidden sm:inline">Stofna aðgang</span>
                <ArrowRightIcon className="hidden sm:block" size={16} />
              </Link>
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="mx-auto min-w-0 w-full max-w-[1200px] flex-1 px-3 pb-10 pt-5 sm:px-5 sm:pt-7 lg:pb-12">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge>Sýningarútgáfa</Badge>
            <p className="mt-2 text-sm text-ink/55">Sýnigögn · breytingar vistast ekki</p>
          </div>
          <Button type="button" variant="ghost" size="sm" className="hidden w-fit sm:inline-flex" onClick={() => navigate("overview")}>
            <HouseIcon size={17} weight="duotone" />
            Heim
          </Button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            {view === "overview" ? <Overview onNavigate={navigate} marketData={marketData} /> : null}
            {view === "transactions" ? <Transactions /> : null}
            {view === "bills" ? <Bills /> : null}
            {view === "savings" ? <Savings /> : null}
            {view === "realEstate" ? <RealEstate data={realEstateData} /> : null}
            {view === "markets" ? <Markets data={marketData} /> : null}
            {view === "analytics" ? <Analytics /> : null}
          </motion.div>
        </AnimatePresence>
      </main>

      <AppFooter mode="demo" onDemoNavigate={navigate} reserveMobileNavSpace />

      <motion.nav
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line/10 bg-surface/95 shadow-[0_-8px_24px_rgba(var(--shadow-soft)/0.08)] backdrop-blur-xl lg:hidden"
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
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-current={moreOpen || mobileMoreViews.some((item) => item.id === view) ? "page" : undefined}
            aria-expanded={moreOpen}
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
      </motion.nav>

      <AnimatePresence>
        {moreOpen ? (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" className="absolute inset-0 h-full w-full bg-black/35 backdrop-blur-[2px]" aria-label="Loka valmynd" onClick={() => setMoreOpen(false)} />
            <motion.div
              id="demo-mobile-more-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Fleiri sýningarsíður"
              initial={{ y: 28 }}
              animate={{ y: 0 }}
              exit={{ y: 28 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-0 bottom-0 rounded-t-lg border-t border-line/10 bg-surface px-4 pb-5 pt-3 text-ink shadow-[0_-16px_40px_rgba(var(--shadow-soft)/0.16)]"
              style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
            >
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line/20" />
              <div className="flex items-center justify-between gap-4 py-2">
                <div>
                  <p className="text-lg font-bold">Meira</p>
                  <p className="text-xs text-ink/50">Fleiri hlutar sýningarútgáfunnar</p>
                </div>
                <button type="button" className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-md text-ink/60 transition hover:bg-muted hover:text-ink" aria-label="Loka valmynd" onClick={() => setMoreOpen(false)}>
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
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
        </div>
      </TooltipProvider>
    </MotionConfig>
  );
}
