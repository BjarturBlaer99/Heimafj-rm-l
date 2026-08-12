"use client";

import { ArrowDownRightIcon } from "@phosphor-icons/react/dist/csr/ArrowDownRight";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/csr/ArrowUpRight";
import { BankIcon } from "@phosphor-icons/react/dist/csr/Bank";
import { ChartLineUpIcon } from "@phosphor-icons/react/dist/csr/ChartLineUp";
import { ChartPieSliceIcon } from "@phosphor-icons/react/dist/csr/ChartPieSlice";
import { CurrencyCircleDollarIcon } from "@phosphor-icons/react/dist/csr/CurrencyCircleDollar";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react/dist/csr/GlobeHemisphereWest";
import { PulseIcon } from "@phosphor-icons/react/dist/csr/Pulse";
import { AnimatePresence, motion, MotionConfig, useReducedMotion, type Variants } from "motion/react";
import Link from "next/link";
import { useId, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { MarketPoint, MarketSnapshot, StockSnapshot } from "@/lib/market-data";
import { cn } from "@/lib/utils";

type MarketTab = "stocks" | "funds" | "fx" | "economy";

const cardGridVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.06,
      staggerChildren: 0.065
    }
  }
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.44, ease: [0.22, 1, 0.36, 1] }
  }
};

const stockNumber = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const icelandicMonths = ["jan.", "feb.", "mar.", "apr.", "maí", "jún.", "júl.", "ágú.", "sep.", "okt.", "nóv.", "des."];

function formatDecimal(value: number, minimumFractionDigits = 1, maximumFractionDigits = 2) {
  const sign = value < 0 ? "-" : "";
  const [rawInteger, rawFraction = ""] = Math.abs(value).toFixed(maximumFractionDigits).split(".");
  let fraction = rawFraction;
  while (fraction.length > minimumFractionDigits && fraction.endsWith("0")) {
    fraction = fraction.slice(0, -1);
  }
  const integer = rawInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${integer}${fraction ? `,${fraction}` : ""}`;
}

function formatPercent(value: number) {
  return `${formatDecimal(value)}%`;
}

function formatRate(value: number) {
  return `${formatDecimal(value)} kr.`;
}

function formatChange(value: number, suffix = "%") {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatDecimal(value)}${suffix}`;
}

function sourceDate(date: string) {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  return `${day}. ${icelandicMonths[month - 1] ?? ""} ${year}`;
}

function sourceTimestamp(date: string) {
  const value = new Date(date);
  const day = value.getUTCDate();
  const month = icelandicMonths[value.getUTCMonth()] ?? "";
  const hours = String(value.getUTCHours()).padStart(2, "0");
  const minutes = String(value.getUTCMinutes()).padStart(2, "0");
  return `${day}. ${month} kl. ${hours}:${minutes}`;
}

export function ChangeBadge({ value, suffix = "%", inverse = false }: { value: number; suffix?: string; inverse?: boolean }) {
  const positive = value > 0;
  const negative = value < 0;
  const Icon = positive ? ArrowUpRightIcon : negative ? ArrowDownRightIcon : PulseIcon;
  const favorable = inverse ? negative : positive;

  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold",
        value === 0
          ? "border-line/10 bg-muted/65 text-ink/50"
          : favorable
            ? "border-moss/15 bg-moss/10 text-moss"
            : "border-coral/15 bg-coral/10 text-coral"
      )}
    >
      <Icon size={13} weight="bold" />
      {formatChange(value, suffix)}
    </span>
  );
}

function MiniTrend({ points, color }: { points: MarketPoint[]; color: string }) {
  const reduceMotion = useReducedMotion();
  const gradientId = useId().replace(/:/g, "");

  return (
    <div className="h-14 min-w-0" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 6, right: 2, bottom: 0, left: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.24} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={!reduceMotion}
            animationDuration={700}
            animationEasing="ease-out"
            dot={false}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function MarketChart({ points, color, valueLabel }: { points: MarketPoint[]; color: string; valueLabel: string }) {
  const reduceMotion = useReducedMotion();
  const gradientId = useId().replace(/:/g, "");

  return (
    <div className="h-[210px] min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 12, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgb(var(--color-line) / 0.1)" strokeDasharray="3 4" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "rgb(var(--color-ink) / 0.48)", fontSize: 11 }} minTickGap={24} />
          <Tooltip
            cursor={{ stroke: "rgb(var(--color-line) / 0.16)" }}
            contentStyle={{
              background: "rgb(var(--color-surface))",
              border: "1px solid rgb(var(--color-line) / 0.14)",
              borderRadius: 8,
              color: "rgb(var(--color-ink))",
              fontSize: 12
            }}
            formatter={(value: number) => [formatDecimal(Number(value)), valueLabel]}
            labelStyle={{ color: "rgb(var(--color-ink) / 0.55)" }}
          />
          <Area
            type="monotone"
            dataKey="value"
            name={valueLabel}
            stroke={color}
            strokeWidth={2.25}
            fill={`url(#${gradientId})`}
            isAnimationActive={!reduceMotion}
            animationDuration={800}
            animationEasing="ease-out"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusBadge({ status, minimal = false }: { status: "live" | "sample"; minimal?: boolean }) {
  if (status === "sample") return <Badge variant="neutral">Sýnigögn</Badge>;
  if (!minimal) return <Badge variant="success">Uppfært</Badge>;

  return (
    <span className="mt-1 flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-moss" title="Uppfært">
      <span className="h-2 w-2 rounded-full bg-moss shadow-[0_0_0_3px_rgb(var(--color-moss)/0.1)]" />
      <span className="sr-only">Uppfært</span>
    </span>
  );
}

function SummaryCards({ data }: { data: MarketSnapshot }) {
  const eur = data.fx.find((item) => item.code === "EUR") ?? data.fx[0];
  const usd = data.fx.find((item) => item.code === "USD") ?? data.fx[1] ?? data.fx[0];
  const cards = [
    {
      id: "inflation",
      label: "Verðbólga",
      value: data.inflation.value,
      format: formatPercent,
      change: data.inflation.change,
      changeSuffix: " pr.st.",
      inverse: true,
      detail: `${formatDecimal(data.inflation.monthlyChange)}% milli mánaða`,
      asOf: data.inflation.asOf,
      status: data.inflation.status,
      points: data.inflation.series,
      color: "rgb(var(--color-coral))",
      icon: PulseIcon,
      iconTone: "bg-coral/10 text-coral"
    },
    {
      id: "policy",
      label: "Meginvextir",
      value: data.policyRate.value,
      format: formatPercent,
      change: data.policyRate.change,
      changeSuffix: " pr.st.",
      inverse: true,
      detail: "Vextir á 7 daga innlánum",
      asOf: data.policyRate.asOf,
      status: data.policyRate.status,
      points: data.policyRate.series,
      color: "rgb(var(--color-violet))",
      icon: BankIcon,
      iconTone: "bg-violet/10 text-violet"
    },
    {
      id: "eur",
      label: "EUR / ISK",
      value: eur.value,
      format: formatRate,
      change: eur.changePercent,
      changeSuffix: "%",
      inverse: false,
      detail: eur.name,
      asOf: eur.asOf,
      status: eur.status,
      points: eur.series,
      color: "rgb(var(--color-accent))",
      icon: GlobeHemisphereWestIcon,
      iconTone: "bg-accent/10 text-accent"
    },
    {
      id: "usd",
      label: "USD / ISK",
      value: usd.value,
      format: formatRate,
      change: usd.changePercent,
      changeSuffix: "%",
      inverse: false,
      detail: usd.name,
      asOf: usd.asOf,
      status: usd.status,
      points: usd.series,
      color: "rgb(var(--color-lagoon))",
      icon: CurrencyCircleDollarIcon,
      iconTone: "bg-lagoon/10 text-lagoon"
    }
  ];

  return (
    <motion.div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" variants={cardGridVariants} initial="hidden" animate="visible">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <motion.div key={card.id} variants={cardVariants} whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 420, damping: 30 }} className="h-full min-w-0">
            <Card className="h-full min-h-[176px] overflow-hidden p-0 transition-colors duration-200 hover:border-accent/25">
              <div className="flex h-full flex-col p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-md", card.iconTone)}>
                      <Icon size={19} weight="duotone" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold leading-tight">{card.label}</p>
                      <p className="mt-1 text-xs leading-snug text-ink/45">{card.detail}</p>
                    </div>
                  </div>
                  <StatusBadge status={card.status} minimal />
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <p className="text-2xl font-bold leading-none">
                    <AnimatedNumber value={card.value} format={card.format} />
                  </p>
                  <ChangeBadge value={card.change} suffix={card.changeSuffix} inverse={card.inverse} />
                </div>
                <div className="mt-auto pt-2">
                  <MiniTrend points={card.points} color={card.color} />
                  <p className="mt-1 text-[11px] text-ink/40">{sourceDate(card.asOf)}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function AssetPanel({ assets, kind }: { assets: StockSnapshot[]; kind: "stock" | "fund" }) {
  const isFund = kind === "fund";

  return (
    <motion.div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" variants={cardGridVariants} initial="hidden" animate="visible">
      {assets.map((asset) => (
        <motion.div key={asset.symbol} variants={cardVariants} whileHover={{ y: -3 }} className="min-w-0">
          <Card className="h-full min-h-[220px] overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-md text-sm font-black",
                  isFund ? "bg-violet/10 text-violet" : "bg-accent/10 text-accent"
                )}>
                  {asset.symbol.slice(0, 3)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-bold">{asset.name}</p>
                  <p className="text-xs font-semibold text-ink/45">{asset.symbol}</p>
                </div>
              </div>
              <StatusBadge status={asset.status} />
            </div>
            <div className="mt-5 flex items-end justify-between gap-3">
              <p className="text-2xl font-bold"><AnimatedNumber value={asset.value} format={stockNumber.format} /></p>
              <ChangeBadge value={asset.changePercent} />
            </div>
            <div className="mt-3">
              <MiniTrend points={asset.series} color={asset.change >= 0 ? "rgb(var(--color-moss))" : "rgb(var(--color-coral))"} />
            </div>
            <p className="mt-2 text-xs text-ink/45">{isFund ? "Lokaverð sjóðs" : "Lokaverð"} {sourceDate(asset.asOf)}</p>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}

function FxPanel({ data }: { data: MarketSnapshot }) {
  return (
    <motion.div className="grid gap-3 md:grid-cols-2" variants={cardGridVariants} initial="hidden" animate="visible">
      {data.fx.map((currency, index) => (
        <motion.div key={currency.code} variants={cardVariants} whileHover={{ y: -2 }}>
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-md text-xs font-black", index % 2 ? "bg-lagoon/10 text-lagoon" : "bg-accent/10 text-accent")}>
                  {currency.code}
                </span>
                <div className="min-w-0">
                  <p className="font-bold">{currency.code} / ISK</p>
                  <p className="truncate text-xs text-ink/45">{currency.name}</p>
                </div>
              </div>
              <StatusBadge status={currency.status} />
            </div>
            <div className="mt-4 flex items-end justify-between gap-3">
              <p className="text-2xl font-bold"><AnimatedNumber value={currency.value} format={formatRate} /></p>
              <ChangeBadge value={currency.changePercent} />
            </div>
            <MiniTrend points={currency.series} color={index % 2 ? "rgb(var(--color-lagoon))" : "rgb(var(--color-accent))"} />
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}

function EconomyPanel({ data }: { data: MarketSnapshot }) {
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-ink/45">Síðustu 12 mánuðir</p>
            <h3 className="mt-1 text-lg font-bold">Verðbólga</h3>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-coral">{formatPercent(data.inflation.value)}</p>
            <p className="text-xs text-ink/45">VNV {formatDecimal(data.inflation.index)}</p>
          </div>
        </div>
        <MarketChart points={data.inflation.series} color="rgb(var(--color-coral))" valueLabel="Verðbólga" />
      </Card>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-ink/45">Vextir á 7 daga innlánum</p>
            <h3 className="mt-1 text-lg font-bold">Meginvextir</h3>
          </div>
          <p className="text-2xl font-bold text-violet">{formatPercent(data.policyRate.value)}</p>
        </div>
        <MarketChart points={data.policyRate.series} color="rgb(var(--color-violet))" valueLabel="Meginvextir" />
      </Card>
    </div>
  );
}

export function MarketOverview({
  data,
  compact = false,
  detailsHref
}: {
  data: MarketSnapshot;
  compact?: boolean;
  detailsHref?: string;
}) {
  const [tab, setTab] = useState<MarketTab>("stocks");
  const tabs: Array<{ id: MarketTab; label: string; icon: typeof ChartLineUpIcon }> = [
    { id: "stocks", label: "Hlutabréf", icon: ChartLineUpIcon },
    { id: "funds", label: "Sjóðir", icon: ChartPieSliceIcon },
    { id: "fx", label: "Gengi", icon: GlobeHemisphereWestIcon },
    { id: "economy", label: "Hagkerfið", icon: BankIcon }
  ];

  return (
    <MotionConfig reducedMotion="user">
      <section aria-labelledby="market-overview-title">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="market-overview-title" className="text-xl font-bold sm:text-2xl">Markaðspúls</h2>
              <Badge variant="neutral">Ísland og heimurinn</Badge>
            </div>
            <p className="mt-1 text-sm text-ink/50">Verðlag, vextir, gjaldmiðlar og markaðir á einum stað.</p>
          </div>
          {detailsHref ? (
            <Button asChild variant="ghost" size="sm" className="motion-link w-fit text-accent hover:text-accent">
              <Link href={detailsHref}>
                Skoða markaði
                <ArrowRightIcon size={16} />
              </Link>
            </Button>
          ) : null}
        </div>

        <SummaryCards data={data} />

        {!compact ? (
          <div className="mt-4">
            <div className="mb-4 grid max-w-full grid-cols-2 gap-1 rounded-md border border-line/10 bg-muted/65 p-1 sm:flex sm:overflow-x-auto" role="tablist" aria-label="Markaðsgögn">
              {tabs.map((item) => {
                const active = tab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(item.id)}
                    className={cn("focus-ring relative flex min-h-10 min-w-0 flex-1 items-center justify-center gap-2 overflow-hidden rounded-md px-2 text-xs font-bold transition sm:min-w-[116px] sm:px-3 sm:text-sm", active ? "text-ink" : "text-ink/50 hover:text-ink")}
                  >
                    {active ? <motion.span layoutId="market-tab" className="absolute inset-0 rounded-md bg-surface shadow-sm" transition={{ type: "spring", stiffness: 430, damping: 34 }} /> : null}
                    <Icon className="relative z-10" size={17} weight={active ? "fill" : "duotone"} />
                    <span className="relative z-10">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                role="tabpanel"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                {tab === "stocks" ? <AssetPanel assets={data.stocks} kind="stock" /> : null}
                {tab === "funds" ? <AssetPanel assets={data.funds} kind="fund" /> : null}
                {tab === "fx" ? <FxPanel data={data} /> : null}
                {tab === "economy" ? <EconomyPanel data={data} /> : null}
              </motion.div>
            </AnimatePresence>
          </div>
        ) : null}

        {!compact ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink/40">
            <p>Heimildir: Hagstofa Íslands, IS-Macro og Alpha Vantage.</p>
            <p>Sótt {sourceTimestamp(data.generatedAt)}</p>
          </div>
        ) : null}
      </section>
    </MotionConfig>
  );
}
