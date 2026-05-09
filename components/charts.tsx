"use client";

import Link from "next/link";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money, percent } from "@/lib/format";

const axisColor = "rgb(var(--color-ink) / 0.68)";
const gridColor = "rgb(var(--color-line) / 0.12)";
const tooltipStyle = {
  backgroundColor: "rgb(var(--color-surface))",
  border: "1px solid rgb(var(--color-line) / 0.16)",
  borderRadius: "12px",
  color: "rgb(var(--color-ink))"
};

export function TrendChart({ data, height = 220 }: { data: Array<Record<string, string | number>>; height?: number }) {
  return (
    <div className="min-w-0 overflow-hidden">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="month" tick={{ fill: axisColor }} axisLine={{ stroke: gridColor }} tickLine={{ stroke: gridColor }} />
          <YAxis tick={{ fill: axisColor }} axisLine={{ stroke: gridColor }} tickLine={{ stroke: gridColor }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="income" name="Tekjur" stroke="#4f6f52" fill="#d9f4d6" />
          <Area type="monotone" dataKey="expenses" name="Útgjöld" stroke="#f47f6b" fill="#f47f6b33" />
          <Area type="monotone" dataKey="savings" name="Sparnaður" stroke="#3b82f6" fill="#3b82f633" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PieBreakdown({
  data,
  links
}: {
  data: Array<{ name: string; value: number }>;
  links?: Record<string, string>;
}) {
  const colors = ["#4f6f52", "#f2c14e", "#f47f6b", "#3b82f6", "#14b8a6", "#a855f7", "#64748b"];
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-center">
      <div className="min-w-0">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={2}
              stroke="rgb(var(--color-surface))"
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number, _name, payload) => [money(Number(value)), payload?.payload?.name]} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="min-w-0 space-y-2">
        {data.map((entry, index) => {
          const href = links?.[entry.name];
          const content = (
            <>
              <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-semibold">{entry.name}</p>
                  <p className="shrink-0 text-sm font-bold">{money(entry.value)}</p>
                </div>
                <p className="text-xs text-ink/55">{percent(total > 0 ? (entry.value / total) * 100 : 0)}</p>
              </div>
            </>
          );

          return href ? (
            <Link key={entry.name} href={href} className="flex min-w-0 items-start gap-3 rounded-lg border border-line/10 bg-surface/70 px-3 py-2 transition hover:bg-mint/35">
              {content}
            </Link>
          ) : (
            <div key={entry.name} className="flex min-w-0 items-start gap-3 rounded-lg border border-line/10 bg-surface/70 px-3 py-2">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CategoryBars({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <div className="min-w-0 overflow-hidden">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="name" tick={{ fill: axisColor }} axisLine={{ stroke: gridColor }} tickLine={{ stroke: gridColor }} />
          <YAxis tick={{ fill: axisColor }} axisLine={{ stroke: gridColor }} tickLine={{ stroke: gridColor }} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [money(Number(value)), "Upphæð"]} />
          <Bar dataKey="value" name="Upphæð" fill="#4f6f52" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
