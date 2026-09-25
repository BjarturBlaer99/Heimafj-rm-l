"use client";

import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { money } from "@/lib/format";
import styles from "./dashboard-cashflow.module.css";

type CashflowMonth = { month: string; income: number; expenses: number; savings: number };
type Props = { data: CashflowMonth[]; currency?: string };

function axisStep(maximum: number) {
  if (maximum <= 0) return 250;
  const roughStep = maximum / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step = [1, 2, 2.5, 5, 10].find((value) => value * magnitude >= roughStep) ?? 10;
  return Math.max(1, step * magnitude);
}

function compactNumber(value: number) {
  // Keep server and browser output identical even when their ICU locales differ.
  const [integer, decimal] = value.toFixed(1).split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decimal && decimal !== "0" ? `${grouped},${decimal}` : grouped;
}

function tickLabel(value: number, currency: string) {
  const unit = currency === "ISK" ? "kr." : currency;
  if (value >= 1_000_000) return `${compactNumber(value / 1_000_000)} m. ${unit}`;
  if (value >= 1_000) return `${compactNumber(value / 1_000)} þ. ${unit}`;
  return money(value, currency);
}

export function DashboardCashflow({ data, currency = "ISK" }: Props) {
  const months = data.slice(-6);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const detailsId = useId();
  const descriptionId = useId();
  const selectedIndex = Math.max(0, selectedMonth !== null && months.some((month) => month.month === selectedMonth)
    ? months.findIndex((month) => month.month === selectedMonth)
    : months.length - 1);
  const selected = months[selectedIndex];

  if (!selected) {
    return <div className={styles.empty}>Engar færslur til að sýna enn.</div>;
  }

  const maximum = Math.max(0, ...months.flatMap((month) => [month.income, month.expenses]));
  const step = axisStep(maximum);
  const ceiling = step * 4;
  const ticks = Array.from({ length: 5 }, (_, index) => ceiling - index * step);

  function moveSelection(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case "ArrowLeft": next = (index - 1 + months.length) % months.length; break;
      case "ArrowRight": next = (index + 1) % months.length; break;
      case "Home": next = 0; break;
      case "End": next = months.length - 1; break;
      default: return;
    }
    event.preventDefault();
    setSelectedMonth(months[next].month);
    buttons.current[next]?.focus();
  }

  return (
    <div className={styles.cashflow}>
      <div className={styles.legend} aria-hidden="true">
        <span><i className={styles.incomeKey} />Tekjur</span>
        <span><i className={styles.expenseKey} />Útgjöld</span>
      </div>
      <p id={descriptionId} className="sr-only">Veldu mánuð til að sjá upphæðirnar. Notaðu vinstri og hægri örvatakka til að skipta um mánuð.</p>
      <div className={styles.chart}>
        <div className={styles.axis} aria-hidden="true">
          {ticks.map((tick, index) => <span key={tick} style={{ top: `${index * 25}%` }}>{tickLabel(tick, currency)}</span>)}
        </div>
        <div className={styles.plot}>
          <div className={styles.grid} aria-hidden="true">
            {ticks.map((tick, index) => <span key={tick} style={{ top: `${index * 25}%` }} />)}
          </div>
          <div className={styles.months} role="group" aria-label="Tekjur og útgjöld eftir mánuðum" aria-describedby={descriptionId} style={{ "--month-count": months.length } as CSSProperties}>
            {months.map((month, index) => {
              const active = index === selectedIndex;
              return (
                <button
                  key={month.month}
                  ref={(button) => { buttons.current[index] = button; }}
                  type="button"
                  className={styles.month}
                  aria-pressed={active}
                  aria-label={`${month.month}: Tekjur ${money(month.income, currency)}, útgjöld ${money(month.expenses, currency)}, mismunur ${money(month.savings, currency)}`}
                  aria-controls={detailsId}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setSelectedMonth(month.month)}
                  onKeyDown={(event) => moveSelection(event, index)}
                >
                  <span className={styles.bars} aria-hidden="true">
                    <span className={styles.incomeBar} style={{ height: `${month.income / ceiling * 100}%` }} />
                    <span className={styles.expenseBar} style={{ height: `${month.expenses / ceiling * 100}%` }} />
                  </span>
                  <span className={styles.monthName} aria-hidden="true">{month.month.replace(/\s+\d{4}$/, "")}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div id={detailsId} className={styles.details}>
        <p className={styles.selectedMonth}>{selected.month}</p>
        <dl className={styles.values}>
          <div><dt>Tekjur</dt><dd className={styles.incomeValue}>{money(selected.income, currency)}</dd></div>
          <div><dt>Útgjöld</dt><dd>{money(selected.expenses, currency)}</dd></div>
          <div><dt>Mismunur</dt><dd className={selected.savings < 0 ? styles.negativeValue : undefined}>{money(selected.savings, currency)}</dd></div>
        </dl>
      </div>
    </div>
  );
}
