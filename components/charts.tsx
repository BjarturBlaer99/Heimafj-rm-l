"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip, XAxis, YAxis } from "recharts";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";
import { money, percent } from "@/lib/format";

const axisColor = "rgb(var(--color-ink) / 0.68)";
const gridColor = "rgb(var(--color-line) / 0.07)";
const tooltipStyle = {
  backgroundColor: "rgb(var(--color-surface))",
  border: "1px solid rgb(var(--color-line) / 0.16)",
  borderRadius: "8px",
  color: "rgb(var(--color-ink))",
  boxShadow: "0 4px 20px rgb(var(--shadow-soft) / 0.08)",
  maxWidth: "min(240px, calc(100vw - 64px))",
  whiteSpace: "normal" as const,
  overflowWrap: "anywhere" as const
};

function compactAxisValue(value: number) {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toLocaleString("is-IS", { maximumFractionDigits: 1 })} m.`;
  if (absolute >= 1_000) return `${Math.round(value / 1_000).toLocaleString("is-IS")} þ.`;
  return value.toLocaleString("is-IS");
}

type PieTooltipEntry = {
  color?: string;
  name?: string | number;
  value?: string | number;
  payload?: { name?: string; value?: number };
};

function PieTooltip({ active, payload, total }: { active?: boolean; payload?: PieTooltipEntry[]; total: number }) {
  const entry = payload?.[0];
  if (!active || !entry) return null;

  const name = entry.payload?.name ?? String(entry.name ?? "");
  const value = Number(entry.payload?.value ?? entry.value ?? 0);

  return (
    <div className="pointer-events-none min-w-[150px] max-w-[min(240px,calc(100vw-64px))] break-words rounded-md border border-line/15 bg-surface px-3 py-2.5 text-ink shadow-soft">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
        <p className="min-w-0 flex-1 break-words text-sm font-semibold">{name}</p>
      </div>
      <p className="mt-1 text-sm font-bold">{money(value)}</p>
      <p className="text-xs text-ink/55">{percent(total > 0 ? (value / total) * 100 : 0)}</p>
    </div>
  );
}

function renderActivePieSector(props: PieSectorDataItem) {
  const outerRadius = typeof props.outerRadius === "number" ? props.outerRadius : Number.parseFloat(String(props.outerRadius ?? 0));
  return <Sector {...props} outerRadius={outerRadius + 6} />;
}

export function TrendChart({ data, height = 220 }: { data: Array<Record<string, string | number>>; height?: number }) {
  return (
    <div className="min-w-0 overflow-visible [&_svg]:overflow-visible">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 4" stroke={gridColor} />
          <XAxis dataKey="month" interval="preserveStartEnd" minTickGap={18} tick={{ fill: axisColor, fontSize: 11 }} axisLine={{ stroke: gridColor }} tickLine={false} />
          <YAxis width={46} tickFormatter={compactAxisValue} tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => Number(value).toLocaleString("is-IS", { maximumFractionDigits: 2 })} />
          <Area type="monotone" dataKey="income" name="Tekjur" stroke="rgb(var(--color-accent))" strokeWidth={2.25} fill="rgb(var(--color-accent) / 0.055)" isAnimationActive={false} />
          <Area type="monotone" dataKey="expenses" name="Útgjöld" stroke="rgb(var(--color-coral))" strokeWidth={2} fill="transparent" isAnimationActive={false} />
          <Area type="monotone" dataKey="savings" name="Sparnaður" stroke="rgb(var(--color-lagoon))" strokeWidth={2} fill="transparent" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-ink/65" aria-label="Skýringar á línuriti">
        <span className="inline-flex items-center gap-2"><span className="h-0.5 w-3.5 rounded bg-accent" />Tekjur</span>
        <span className="inline-flex items-center gap-2"><span className="h-0.5 w-3.5 rounded bg-coral" />Útgjöld</span>
        <span className="inline-flex items-center gap-2"><span className="h-0.5 w-3.5 rounded bg-lagoon" />Sparnaður</span>
      </div>
    </div>
  );
}

export function Sparkline({
  data,
  dataKey,
  color = "rgb(var(--color-accent))"
}: {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  color?: string;
}) {
  const gradientId = useId().replace(/:/g, "");
  const chartData = useMemo(() => {
    const values = data.map((point) => Number(point[dataKey])).filter(Number.isFinite);
    const minimum = values.length ? Math.min(...values) : 0;
    const maximum = values.length ? Math.max(...values) : 0;
    const range = maximum - minimum;

    return data.map((point) => {
      const value = Number(point[dataKey]);
      const normalized = Number.isFinite(value) && range > 0
        ? 24 + ((value - minimum) / range) * 68
        : 58;
      return { ...point, sparklineValue: normalized };
    });
  }, [data, dataKey]);

  return (
    <div className="h-14 min-w-0 overflow-visible [&_svg]:overflow-visible" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 6, right: 4, bottom: 6, left: 4 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.13} />
              <stop offset="62%" stopColor={color} stopOpacity={0.04} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={[0, 100]} />
          <Area
            type="monotone"
            dataKey="sparklineValue"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            dot={false}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PieBreakdown({
  data,
  links,
  centerLabel = "Heildarútgjöld"
}: {
  data: Array<{ name: string; value: number }>;
  links?: Record<string, string>;
  centerLabel?: string;
}) {
  const colors = [
    "rgb(var(--color-accent))",
    "rgb(var(--color-coral))",
    "rgb(var(--color-gold))",
    "rgb(var(--color-lagoon))",
    "rgb(var(--color-violet))",
    "rgb(var(--color-moss))",
    "rgb(var(--color-steel))"
  ];
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const [activeIndex, setActiveIndex] = useState<number>();

  return (
    <div className="grid min-w-0 gap-5">
      <div className="relative h-[230px] min-w-0 sm:h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 16, right: 16, bottom: 16, left: 16 }}>
            <Pie
              data={[{ value: total || 1 }]}
              dataKey="value"
              innerRadius={64}
              outerRadius={96}
              fill="rgb(var(--color-line) / 0.06)"
              stroke="none"
              isAnimationActive={false}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={64}
              outerRadius={96}
              paddingAngle={3}
              cornerRadius={5}
              stroke="rgb(var(--color-surface))"
              strokeWidth={3}
              activeIndex={activeIndex}
              activeShape={renderActivePieSector}
              onMouseEnter={(_entry, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(undefined)}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" fill="rgb(var(--color-ink) / 0.48)" fontSize="12" fontWeight="600">
              {centerLabel}
            </text>
            <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" fill="rgb(var(--color-ink))" fontSize="15" fontWeight="800">
              {money(total)}
            </text>
            <Tooltip
              allowEscapeViewBox={{ x: false, y: true }}
              content={<PieTooltip total={total} />}
              cursor={false}
              wrapperStyle={{ zIndex: 30, outline: "none" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid min-w-0 gap-2.5 sm:grid-cols-2">
        {data.map((entry, index) => {
          const href = links?.[entry.name];
          const isActive = activeIndex === index;
          const share = total > 0 ? (entry.value / total) * 100 : 0;
          const itemClassName = `group flex min-w-0 items-start gap-2.5 rounded-md border bg-surface/80 px-3 py-2.5 transition duration-200 ${
            isActive
              ? "border-accent/20 bg-accent/5"
              : "border-transparent hover:border-line/10 hover:bg-muted/35"
          }`;
          const content = (
            <>
              <span
                className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_0_4px_rgb(var(--color-line)/0.04)]"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-col items-start gap-1">
                  <p className="min-w-0 break-words text-sm font-semibold">{entry.name}</p>
                  <p className="shrink-0 text-sm font-bold">{money(entry.value)}</p>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-line/8">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${Math.max(share, 2)}%`, backgroundColor: colors[index % colors.length] }}
                    />
                  </div>
                  <p className="w-10 shrink-0 text-right text-xs font-semibold text-ink/50">{percent(share)}</p>
                </div>
              </div>
            </>
          );

          return href ? (
            <Link
              key={entry.name}
              href={href}
              className={itemClassName}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(undefined)}
            >
              {content}
            </Link>
          ) : (
            <div
              key={entry.name}
              className={itemClassName}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(undefined)}
            >
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CategoryBars({ data }: { data: Array<{ name: string; value: number }> }) {
  const chartHeight = Math.max(220, data.length * 38);

  return (
    <div className="min-w-0 overflow-visible [&_svg]:overflow-visible">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis type="number" tickFormatter={compactAxisValue} tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={88} tick={<CategoryAxisTick />} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [money(Number(value)), "Upphæð"]} />
          <Bar dataKey="value" name="Upphæð" fill="rgb(var(--color-accent))" radius={[0, 6, 6, 0]} barSize={18} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CategoryAxisTick({ x = 0, y = 0, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const name = payload?.value ?? "";
  const label = name.length > 12 ? `${name.slice(0, 11)}…` : name;
  return <text x={x} y={y} dy={4} textAnchor="end" fill={axisColor} fontSize={11}><title>{name}</title>{label}</text>;
}
