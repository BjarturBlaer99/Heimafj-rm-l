"use client";

import { useState } from "react";
import { DateInput, Field } from "@/components/ui";
import styles from "@/app/(app)/transactions/transactions.module.css";

export function TransactionPeriodFields({ period, month, from, to }: { period: string; month: string; from?: string; to?: string }) {
  const [mode, setMode] = useState(period);
  const [start, setStart] = useState(from ?? "");
  const [end, setEnd] = useState(to ?? "");
  return <fieldset className={styles.periodFields}>
    <legend>Tímabil</legend>
    <div className={styles.periodChoices}>{[["month", "Mánuður"], ["range", "Dagsetningabil"], ["all", "Öll tímabil"]].map(([value, label]) => <label key={value}><input type="radio" name="period" value={value} checked={mode === value} onChange={() => setMode(value)} />{label}</label>)}</div>
    <div className={styles.periodDates}>
      <Field label="Mánuður"><DateInput name="month" type="month" defaultValue={month} disabled={mode !== "month"} required={mode === "month"} /></Field>
      <Field label="Frá"><DateInput name="from" type="date" value={start} onChange={(event) => setStart(event.target.value)} max={end || undefined} disabled={mode !== "range"} /></Field>
      <Field label="Til"><DateInput name="to" type="date" value={end} onChange={(event) => setEnd(event.target.value)} min={start || undefined} disabled={mode !== "range"} /></Field>
    </div>
  </fieldset>;
}
