"use client";

import { ArrowDownRightIcon } from "@phosphor-icons/react/dist/csr/ArrowDownRight";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/csr/ArrowUpRight";
import { BankIcon } from "@phosphor-icons/react/dist/csr/Bank";
import { BedIcon } from "@phosphor-icons/react/dist/csr/Bed";
import { BuildingsIcon } from "@phosphor-icons/react/dist/csr/Buildings";
import { CalculatorIcon } from "@phosphor-icons/react/dist/csr/Calculator";
import { ChartLineUpIcon } from "@phosphor-icons/react/dist/csr/ChartLineUp";
import { HeartIcon } from "@phosphor-icons/react/dist/csr/Heart";
import { HouseLineIcon } from "@phosphor-icons/react/dist/csr/HouseLine";
import { MapPinIcon } from "@phosphor-icons/react/dist/csr/MapPin";
import { RulerIcon } from "@phosphor-icons/react/dist/csr/Ruler";
import { motion, MotionConfig, useReducedMotion, type Variants } from "motion/react";
import Image from "next/image";
import { useId, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChartShadowFilter } from "@/components/ui/chart-shadow-filter";
import { money } from "@/lib/format";
import type { HousingSeries, RealEstateSnapshot } from "@/lib/real-estate-data";
import { cn } from "@/lib/utils";

type LocationFilter = "all" | "capital" | "outside";

const revealGroup: Variants = {
  hidden: {},
  visible: { transition: { delayChildren: 0.05, staggerChildren: 0.065 } }
};

const revealItem: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.99 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] }
  }
};

const inputClass =
  "focus-ring h-10 w-full rounded-md border border-line/15 bg-muted/45 px-3 text-sm font-semibold text-ink transition hover:border-accent/30 focus:bg-surface";

const icelandicMonths = ["jan.", "feb.", "mar.", "apr.", "maí", "jún.", "júl.", "ágú.", "sep.", "okt.", "nóv.", "des."];

const listings = [
  {
    id: "capital-apartment",
    title: "Björt íbúð á höfuðborgarsvæðinu",
    location: "Höfuðborgarsvæðið",
    locationGroup: "capital" as const,
    type: "Fjölbýli",
    price: 74_900_000,
    size: 92,
    rooms: 4,
    imagePosition: "22% center"
  },
  {
    id: "capital-townhouse",
    title: "Nútímalegt raðhús",
    location: "Kópavogur",
    locationGroup: "capital" as const,
    type: "Raðhús",
    price: 109_500_000,
    size: 146,
    rooms: 5,
    imagePosition: "88% center"
  },
  {
    id: "outside-home",
    title: "Fjölskyldueign á Norðurlandi",
    location: "Norðurland",
    locationGroup: "outside" as const,
    type: "Sérbýli",
    price: 63_900_000,
    size: 128,
    rooms: 5,
    imagePosition: "64% center"
  }
];

function formatDecimal(value: number, maximumFractionDigits = 2) {
  const sign = value < 0 ? "-" : "";
  const [integer, rawFraction = ""] = Math.abs(value).toFixed(maximumFractionDigits).split(".");
  const fraction = rawFraction.replace(/0+$/, "");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${grouped}${fraction ? `,${fraction}` : ""}`;
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatDecimal(value)}%`;
}

function sourceDate(date: string) {
  const [year, month] = date.slice(0, 10).split("-").map(Number);
  return `${icelandicMonths[month - 1] ?? ""} ${year}`;
}

function Change({ value, inverse = false }: { value: number; inverse?: boolean }) {
  const favorable = inverse ? value <= 0 : value >= 0;
  const Icon = value >= 0 ? ArrowUpRightIcon : ArrowDownRightIcon;

  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold",
        favorable ? "border-moss/15 bg-moss/10 text-moss" : "border-coral/15 bg-coral/10 text-coral"
      )}
    >
      <Icon size={13} weight="bold" />
      {formatPercent(value)}
    </span>
  );
}

function HousingChart({ series }: { series: HousingSeries[] }) {
  const [activeId, setActiveId] = useState<HousingSeries["id"]>("all");
  const reduceMotion = useReducedMotion();
  const active = series.find((item) => item.id === activeId) ?? series[0];
  const gradientId = useId().replace(/:/g, "");
  const shadowId = useId().replace(/:/g, "");

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ChartLineUpIcon size={20} className="text-accent" weight="duotone" />
            <h2 className="text-lg font-bold">Þróun íbúðaverðs</h2>
          </div>
          <p className="mt-1 text-sm text-ink/50">Síðustu 24 mánuðir · vísitala, mars 2000 = 100</p>
        </div>
        <div className="sm:text-right">
          <p className="text-2xl font-bold">{formatDecimal(active.value, 1)}</p>
          <div className="mt-1 flex items-center gap-2 sm:justify-end">
            <span className="text-xs text-ink/45">12 mánaða breyting</span>
            <Change value={active.annualChange} />
          </div>
        </div>
      </div>

      <div className="mt-5 grid max-w-full grid-cols-2 gap-1 rounded-md border border-line/10 bg-muted/50 p-1 sm:flex sm:overflow-x-auto" role="tablist" aria-label="Tegund húsnæðis">
        {series.map((item) => {
          const selected = item.id === active.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveId(item.id)}
              className={cn(
                "focus-ring relative min-h-9 min-w-0 flex-1 overflow-hidden rounded-md px-2 text-xs font-bold transition sm:min-w-[112px] sm:px-3",
                selected ? "text-ink" : "text-ink/50 hover:text-ink"
              )}
            >
              {selected ? <motion.span layoutId="housing-index-tab" className="absolute inset-0 rounded-md bg-surface shadow-sm" transition={{ type: "spring", stiffness: 430, damping: 34 }} /> : null}
              <span className="relative z-10">{item.shortLabel}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 h-[260px] min-w-0 overflow-visible sm:h-[310px] [&_svg]:overflow-visible">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={active.points} margin={{ top: 10, right: 10, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(var(--color-accent))" stopOpacity={0.2} />
                <stop offset="100%" stopColor="rgb(var(--color-accent))" stopOpacity={0.02} />
              </linearGradient>
              <ChartShadowFilter id={shadowId} color="rgb(var(--color-accent))" opacity={0.28} blur={4} offsetY={4} />
            </defs>
            <CartesianGrid vertical={false} stroke="rgb(var(--color-line) / 0.1)" strokeDasharray="3 4" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={30} tick={{ fill: "rgb(var(--color-ink) / 0.45)", fontSize: 11 }} />
            <YAxis domain={["dataMin - 12", "dataMax + 8"]} axisLine={false} tickLine={false} width={48} tick={{ fill: "rgb(var(--color-ink) / 0.45)", fontSize: 11 }} />
            <Tooltip
              cursor={{ stroke: "rgb(var(--color-line) / 0.16)" }}
              contentStyle={{
                background: "rgb(var(--color-surface))",
                border: "1px solid rgb(var(--color-line) / 0.14)",
                borderRadius: 8,
                color: "rgb(var(--color-ink))",
                fontSize: 12,
                boxShadow: "0 14px 32px rgb(var(--shadow-soft) / 0.18)"
              }}
              formatter={(value: number) => [formatDecimal(Number(value), 1), "Vísitala"]}
              labelStyle={{ color: "rgb(var(--color-ink) / 0.55)" }}
            />
            <Area
              type="monotone"
              dataKey="value"
              name="Vísitala"
              stroke="rgb(var(--color-accent))"
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              filter={`url(#${shadowId})`}
              dot={false}
              activeDot={{ r: 4, fill: "rgb(var(--color-accent))", strokeWidth: 0 }}
              isAnimationActive={!reduceMotion}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function MortgageCalculator() {
  const [price, setPrice] = useState(78_000_000);
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [annualRate, setAnnualRate] = useState(8.5);
  const [years, setYears] = useState(40);

  const calculation = useMemo(() => {
    const downPayment = price * (downPaymentPercent / 100);
    const loan = Math.max(0, price - downPayment);
    const months = years * 12;
    const monthlyRate = annualRate / 100 / 12;
    const monthlyPayment = monthlyRate === 0
      ? loan / months
      : (loan * monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1);
    const totalPaid = monthlyPayment * months;

    return {
      downPayment,
      loan,
      monthlyPayment,
      totalInterest: Math.max(0, totalPaid - loan)
    };
  }, [annualRate, downPaymentPercent, price, years]);

  return (
    <section aria-labelledby="mortgage-calculator-title">
      <div className="mb-4 flex items-center gap-2">
        <CalculatorIcon size={21} className="text-accent" weight="duotone" />
        <div>
          <h2 id="mortgage-calculator-title" className="text-xl font-bold">Lánareiknivél</h2>
          <p className="text-sm text-ink/50">Sjáðu áætlaða mánaðargreiðslu á nokkrum sekúndum.</p>
        </div>
      </div>

      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <Card className="h-full">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">
              <span className="flex items-center justify-between gap-3">
                Kaupverð
                <span className="text-ink/55">{money(price)}</span>
              </span>
              <input
                type="range"
                min={30_000_000}
                max={160_000_000}
                step={1_000_000}
                value={price}
                onChange={(event) => setPrice(Number(event.target.value))}
                className="h-2 w-full cursor-pointer accent-accent"
              />
              <input
                type="number"
                min={10_000_000}
                step={500_000}
                value={price}
                onChange={(event) => setPrice(Math.max(0, Number(event.target.value)))}
                className={inputClass}
                aria-label="Kaupverð í krónum"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold">
              <span className="flex items-center justify-between gap-3">
                Eigið fé
                <span className="text-ink/55">{downPaymentPercent}%</span>
              </span>
              <input
                type="range"
                min={10}
                max={60}
                step={1}
                value={downPaymentPercent}
                onChange={(event) => setDownPaymentPercent(Number(event.target.value))}
                className="h-2 w-full cursor-pointer accent-accent"
              />
              <div className="flex h-10 items-center justify-between rounded-md border border-line/15 bg-muted/45 px-3 text-sm">
                <span className="text-ink/50">Upphæð</span>
                <span className="font-bold">{money(calculation.downPayment)}</span>
              </div>
            </label>

            <label className="grid gap-2 text-sm font-semibold">
              <span className="flex items-center justify-between gap-3">
                Ársvextir
                <span className="text-ink/55">{formatDecimal(annualRate, 1)}%</span>
              </span>
              <input
                type="range"
                min={3}
                max={15}
                step={0.1}
                value={annualRate}
                onChange={(event) => setAnnualRate(Number(event.target.value))}
                className="h-2 w-full cursor-pointer accent-accent"
              />
              <input
                type="number"
                min={0}
                max={30}
                step={0.1}
                value={annualRate}
                onChange={(event) => setAnnualRate(Math.max(0, Number(event.target.value)))}
                className={inputClass}
                aria-label="Ársvextir í prósentum"
              />
            </label>

            <fieldset className="grid gap-2 text-sm font-semibold">
              <legend className="mb-2">Lánstími</legend>
              <div className="grid grid-cols-4 gap-1 rounded-md border border-line/10 bg-muted/50 p-1">
                {[20, 25, 30, 40].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setYears(option)}
                    aria-pressed={years === option}
                    className={cn(
                      "focus-ring min-h-10 rounded-md px-2 text-xs font-bold transition",
                      years === option ? "bg-surface text-accent shadow-sm" : "text-ink/50 hover:text-ink"
                    )}
                  >
                    {option} ár
                  </button>
                ))}
              </div>
              <div className="flex h-10 items-center justify-between rounded-md border border-line/15 bg-muted/45 px-3 text-sm">
                <span className="text-ink/50">Veðhlutfall</span>
                <span className="font-bold">{100 - downPaymentPercent}%</span>
              </div>
            </fieldset>
          </div>
        </Card>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <Card className="border-accent/20 bg-accent/5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink/55">Áætluð greiðsla</p>
              <BankIcon size={20} className="text-accent" weight="duotone" />
            </div>
            <p className="mt-3 text-2xl font-bold text-accent sm:text-3xl">{money(calculation.monthlyPayment)}</p>
            <p className="mt-1 text-xs text-ink/45">á mánuði</p>
          </Card>
          <Card>
            <p className="text-sm font-semibold text-ink/55">Lánsupphæð</p>
            <p className="mt-3 text-xl font-bold">{money(calculation.loan)}</p>
          </Card>
          <Card>
            <p className="text-sm font-semibold text-ink/55">Heildarvextir</p>
            <p className="mt-3 text-xl font-bold">{money(calculation.totalInterest)}</p>
          </Card>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink/45">Útreikningurinn miðast við jafnar greiðslur og er aðeins áætlun. Verðtrygging, lántökugjöld og annar kostnaður eru ekki innifalin.</p>
    </section>
  );
}

function PropertyIdeas() {
  const [filter, setFilter] = useState<LocationFilter>("all");
  const [saved, setSaved] = useState<string[]>([]);
  const visibleListings = listings.filter((listing) => filter === "all" || listing.locationGroup === filter);

  function toggleSaved(id: string) {
    setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <section aria-labelledby="property-ideas-title">
      <Card className="mb-5 border-accent/20 bg-accent/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-accent/10 text-accent">
              <BuildingsIcon size={23} weight="duotone" />
            </span>
            <div className="min-w-0">
              <p className="font-bold">Raunverulegar fasteignir</p>
              <p className="mt-1 text-sm leading-relaxed text-ink/50">
                Skoðaðu virkar fasteignaauglýsingar beint hjá Fasteignir.is.
              </p>
            </div>
          </div>
          <Button asChild className="w-full shrink-0 sm:w-auto">
            <a
              href="https://fasteignir.visir.is/"
              target="_blank"
              rel="noopener noreferrer external"
              aria-label="Opna fasteignaleit Fasteignir.is í nýjum flipa"
            >
              Opna Fasteignir.is
              <ArrowSquareOutIcon size={17} weight="bold" />
            </a>
          </Button>
        </div>
      </Card>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="property-ideas-title" className="text-xl font-bold">Sýnifasteignir</h2>
          <p className="mt-1 text-sm text-ink/50">Prófaðu leit, samanburð og vistun með sýnigögnum.</p>
        </div>
        <div className="flex w-fit rounded-md border border-line/10 bg-muted/50 p-1" role="group" aria-label="Sía eftir staðsetningu">
          {([
            ["all", "Allt"],
            ["capital", "Höfuðborg"],
            ["outside", "Landsbyggð"]
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              aria-pressed={filter === id}
              className={cn(
                "focus-ring min-h-9 rounded-md px-3 text-xs font-bold transition",
                filter === id ? "bg-surface text-accent shadow-sm" : "text-ink/50 hover:text-ink"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <motion.div layout className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" variants={revealGroup} initial="hidden" animate="visible">
        {visibleListings.map((listing) => {
          const isSaved = saved.includes(listing.id);
          return (
            <motion.div layout key={listing.id} variants={revealItem} whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 420, damping: 30 }}>
              <Card className="h-full overflow-hidden p-0">
                <div className="relative aspect-[16/9] overflow-hidden border-b border-line/10">
                  <div
                    role="img"
                    aria-label="Nútímalegt íslenskt íbúðarhúsnæði"
                    className="absolute inset-0 bg-cover transition duration-500 hover:scale-[1.025]"
                    style={{ backgroundImage: "url('/images/real-estate-neighborhood.webp')", backgroundPosition: listing.imagePosition }}
                  />
                  <div className="absolute left-3 top-3"><Badge variant="neutral">Sýnigögn</Badge></div>
                  <button
                    type="button"
                    onClick={() => toggleSaved(listing.id)}
                    aria-label={isSaved ? `Fjarlægja ${listing.title} úr vistuðum eignum` : `Vista ${listing.title}`}
                    aria-pressed={isSaved}
                    className={cn(
                      "focus-ring absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-md border shadow-sm backdrop-blur-md transition",
                      isSaved ? "border-coral/25 bg-surface/95 text-coral" : "border-white/40 bg-black/45 text-white hover:bg-black/60"
                    )}
                  >
                    <HeartIcon size={20} weight={isSaved ? "fill" : "bold"} />
                  </button>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase text-accent">{listing.type}</p>
                      <h3 className="mt-1 text-lg font-bold leading-snug">{listing.title}</h3>
                    </div>
                    <p className="shrink-0 text-lg font-bold">{money(listing.price)}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-ink/50">
                    <span className="inline-flex items-center gap-1.5"><MapPinIcon size={15} weight="duotone" />{listing.location}</span>
                    <span className="inline-flex items-center gap-1.5"><RulerIcon size={15} weight="duotone" />{listing.size} m²</span>
                    <span className="inline-flex items-center gap-1.5"><BedIcon size={15} weight="duotone" />{listing.rooms} herb.</span>
                  </div>
                  <div className="mt-4 border-t border-line/10 pt-3 text-sm text-ink/55">
                    Fermetraverð <span className="font-bold text-ink">{money(listing.price / listing.size)}</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}

export function RealEstateOverview({ data }: { data: RealEstateSnapshot }) {
  const total = data.series.find((series) => series.id === "all") ?? data.series[0];

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-7">
        <PropertyIdeas />

        <div className="border-t border-line/10 pt-7">
          <motion.div variants={revealItem} initial="hidden" animate="visible" className="relative min-h-[210px] overflow-hidden rounded-lg border border-line/15 sm:min-h-[280px]">
            <Image
              src="/images/real-estate-neighborhood.webp"
              alt="Nútímalegt íbúðarhúsnæði á Íslandi"
              fill
              priority
              sizes="(max-width: 1200px) 100vw, 1200px"
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-black/65 px-4 py-4 text-white sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:py-5">
              <div>
                <p className="text-xs font-bold uppercase text-white/70">Húsnæðismarkaðurinn</p>
                <p className="mt-1 text-xl font-bold sm:text-2xl">Frá markaðsgögnum að mánaðargreiðslu</p>
              </div>
              <p className="max-w-md text-xs leading-relaxed text-white/75 sm:text-right">Skoðaðu verðþróun og prófaðu forsendur áður en þú tekur næsta skref.</p>
            </div>
          </motion.div>
        </div>

        <motion.div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" variants={revealGroup} initial="hidden" animate="visible">
          <motion.div variants={revealItem}>
            <Card className="h-full">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink/55">Vísitala íbúðaverðs</p>
                <HouseLineIcon size={20} className="text-accent" weight="duotone" />
              </div>
              <p className="mt-4 text-2xl font-bold">{formatDecimal(total.value, 1)}</p>
              <p className="mt-1 text-xs text-ink/45">{sourceDate(total.asOf)}</p>
            </Card>
          </motion.div>
          <motion.div variants={revealItem}>
            <Card className="h-full">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink/55">12 mánaða breyting</p>
                <BuildingsIcon size={20} className="text-violet" weight="duotone" />
              </div>
              <div className="mt-4"><Change value={total.annualChange} /></div>
              <p className="mt-2 text-xs text-ink/45">Landið allt</p>
            </Card>
          </motion.div>
          <motion.div variants={revealItem}>
            <Card className="h-full">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink/55">Mánaðarbreyting</p>
                <ChartLineUpIcon size={20} className="text-lagoon" weight="duotone" />
              </div>
              <div className="mt-4"><Change value={total.monthlyChange} /></div>
              <p className="mt-2 text-xs text-ink/45">Síðasti birtur mánuður</p>
            </Card>
          </motion.div>
          <motion.div variants={revealItem}>
            <Card className="h-full">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink/55">Gagnastaða</p>
                <span className={cn("h-2.5 w-2.5 rounded-full", data.status === "live" ? "bg-moss" : "bg-gold")} />
              </div>
              <p className="mt-4 text-lg font-bold">{data.status === "live" ? "Uppfært" : "Sýnigögn"}</p>
              <p className="mt-1 text-xs text-ink/45">Hagstofa Íslands</p>
            </Card>
          </motion.div>
        </motion.div>

        <div className="border-t border-line/10 pt-7">
          <MortgageCalculator />
        </div>

        <div className="border-t border-line/10 pt-7">
          <HousingChart series={data.series} />
        </div>

        <p className="text-xs leading-relaxed text-ink/40">Byggir á upplýsingum frá Hagstofu Íslands og HMS. Sýnifasteignir eru ekki raunverulegar auglýsingar.</p>
      </div>
    </MotionConfig>
  );
}
