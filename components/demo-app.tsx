"use client";

import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { CalendarDotsIcon } from "@phosphor-icons/react/dist/csr/CalendarDots";
import { ChartDonutIcon } from "@phosphor-icons/react/dist/csr/ChartDonut";
import { ChartLineUpIcon } from "@phosphor-icons/react/dist/csr/ChartLineUp";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
import { HouseIcon } from "@phosphor-icons/react/dist/csr/House";
import { InvoiceIcon } from "@phosphor-icons/react/dist/csr/Invoice";
import { PiggyBankIcon } from "@phosphor-icons/react/dist/csr/PiggyBank";
import { ReceiptIcon } from "@phosphor-icons/react/dist/csr/Receipt";
import { TrendDownIcon } from "@phosphor-icons/react/dist/csr/TrendDown";
import { TrendUpIcon } from "@phosphor-icons/react/dist/csr/TrendUp";
import { UserCircleIcon } from "@phosphor-icons/react/dist/csr/UserCircle";
import { WalletIcon } from "@phosphor-icons/react/dist/csr/Wallet";
import { AnimatePresence, motion, MotionConfig, type Variants } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { CategoryBars, PieBreakdown, Sparkline, TrendChart } from "@/components/charts";
import { MarketOverview } from "@/components/market-overview";
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
import { cn } from "@/lib/utils";

type DemoView = "overview" | "transactions" | "bills" | "savings" | "analytics";
type TransactionFilter = "all" | DemoTransaction["kind"];

const views = [
  { id: "overview" as const, label: "Yfirlit", icon: HouseIcon },
  { id: "transactions" as const, label: "Færslur", icon: ReceiptIcon },
  { id: "bills" as const, label: "Reikningar", icon: InvoiceIcon },
  { id: "savings" as const, label: "Sparnaður", icon: PiggyBankIcon },
  { id: "analytics" as const, label: "Greining", icon: ChartLineUpIcon }
];

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
    <div className="mb-5 border-b border-line/10 pb-5">
      <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
      <p className="mt-1 text-sm text-ink/55">{description}</p>
    </div>
  );
}

function Overview({ onNavigate, marketData }: { onNavigate: (view: DemoView) => void; marketData: MarketSnapshot }) {
  const stats = [
    { label: "Tekjur", value: demoSummary.income, tone: "text-moss", icon: TrendUpIcon, view: "analytics" as const, key: "income" },
    { label: "Útgjöld", value: demoSummary.expenses, tone: "text-coral", icon: TrendDownIcon, view: "analytics" as const, key: "expenses" },
    { label: "Eftir", value: demoSummary.balance, tone: "text-accent", icon: WalletIcon, view: "savings" as const, key: "savings" },
    { label: "Færslur", value: demoSummary.transactionCount, tone: "text-ink", icon: ReceiptIcon, view: "transactions" as const, key: "count" }
  ];

  return (
    <>
      <ViewHeading title="Yfirlit" description={demoSummary.month} />

      <motion.div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" variants={statGridVariants} initial="hidden" animate="visible">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              variants={statCardVariants}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.99 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              className="h-full min-w-0"
            >
              <Card className="h-full overflow-hidden p-0 transition-colors duration-200 hover:border-accent/25">
                <button type="button" onClick={() => onNavigate(stat.view)} className="focus-ring block h-full w-full p-4 text-left sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-ink/55">{stat.label}</p>
                    <span className={cn("grid h-8 w-8 place-items-center rounded-md bg-muted/75", stat.tone)}>
                      <Icon size={18} weight="duotone" />
                    </span>
                  </div>
                  <p className={cn("mt-3 text-xl font-bold", stat.tone)}>
                    <AnimatedNumber value={stat.value} format={stat.key === "count" ? (value) => String(Math.round(value)) : money} />
                  </p>
                  <Sparkline data={demoTrend} dataKey={stat.key === "count" ? "expenses" : stat.key} />
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
            <CheckCircleIcon size={20} className="text-moss" weight="duotone" />
            <h3 className="font-bold">Mánaðarstaða</h3>
          </div>
          <p className="mt-5 text-3xl font-bold text-moss">Góð</p>
          <p className="mt-1 text-sm text-ink/55">37% af tekjum eru eftir.</p>
          <div className="mt-6 grid gap-4">
            <div>
              <div className="mb-1.5 flex justify-between text-xs font-semibold">
                <span>Sparnaðarhlutfall</span>
                <span>12%</span>
              </div>
              <AnimatedProgress value={12} />
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
        <MarketOverview data={marketData} />
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

export function DemoApp({ marketData }: { marketData: MarketSnapshot }) {
  const [view, setView] = useState<DemoView>("overview");

  function navigate(nextView: DemoView) {
    setView(nextView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={280}>
        <div className="min-h-screen bg-paper text-ink">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 z-30 bg-paper/90 px-3 py-3 backdrop-blur-xl sm:px-5"
      >
        <div className="mx-auto flex min-h-[60px] max-w-[1200px] items-center gap-3 rounded-lg border border-line/10 bg-surface/90 px-3 py-2 shadow-soft sm:px-4">
          <button
            type="button"
            onClick={() => navigate("overview")}
            className="focus-ring flex shrink-0 items-center rounded-md px-1 py-1 transition hover:opacity-80"
            aria-label="Fara á yfirlit"
          >
            <span className="whitespace-nowrap text-base font-extrabold leading-none">Mín <span className="text-accent">fjármál</span></span>
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
                  className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-md border border-line/15 bg-surface px-2.5 text-sm font-bold text-ink/65 shadow-sm transition hover:-translate-y-px hover:border-accent/30 hover:bg-muted hover:text-ink"
                  aria-label="Innskráning"
                >
                  <UserCircleIcon size={19} weight="duotone" />
                  <span className="hidden md:inline">Innskráning</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent className="md:hidden">Innskráning</TooltipContent>
            </Tooltip>
            <Button asChild className="motion-link px-3">
              <Link href="/signup">
                <span className="hidden sm:inline">Stofna aðgang</span>
                <span className="sm:hidden">Stofna</span>
                <ArrowRightIcon size={16} />
              </Link>
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="mx-auto min-w-0 max-w-[1200px] px-3 pb-28 pt-5 sm:px-5 sm:pt-7 lg:pb-10">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge>Sýningarútgáfa</Badge>
            <p className="mt-2 text-sm text-ink/55">Sýnigögn · breytingar vistast ekki</p>
          </div>
          <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => navigate("overview")}>
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
            {view === "analytics" ? <Analytics /> : null}
          </motion.div>
        </AnimatePresence>
      </main>

      <motion.nav
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line/10 bg-surface/95 shadow-[0_-8px_24px_rgba(var(--shadow-soft)/0.08)] backdrop-blur-xl lg:hidden"
        aria-label="Sýningarvalmynd"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 px-2">
          {views.map((item) => {
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
        </div>
      </motion.nav>
        </div>
      </TooltipProvider>
    </MotionConfig>
  );
}
