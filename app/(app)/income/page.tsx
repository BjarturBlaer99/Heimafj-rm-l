import { ActionForm } from "@/components/action-form";
import { AmountInput } from "@/components/amount-input";
import { PlusIcon as Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { TrashIcon as Trash2 } from "@phosphor-icons/react/dist/ssr/Trash";
import Link from "next/link";
import { Button, DateInput, EmptyState, Field, PageHeader, inputClass } from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import { deleteMonthlyIncome, saveMonthlyIncome } from "@/lib/actions";
import { getCategories, getTransactions } from "@/lib/data";
import { currentMonth, money } from "@/lib/format";
import { validMonth } from "@/lib/transaction-period";
import styles from "../transactions/transactions.module.css";

function monthLabel(monthStart: string) {
  return new Intl.DateTimeFormat("is-IS", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${monthStart.slice(0, 10)}T12:00:00Z`));
}

export default async function IncomePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const month = validMonth(params.month) ? params.month : undefined;
  const [categories, incomes] = await Promise.all([getCategories(), getTransactions({ type: "income", month })]);
  const incomeCategories = categories.filter((category) => category.type === "income" || category.type === "both");
  const currency = "ISK";
  const monthlyRows = Object.values(incomes.reduce<Record<string, { month: string; total: number; count: number }>>((acc, income) => {
    const month = income.date.slice(0, 7);
    if (!acc[month]) acc[month] = { month, total: 0, count: 0 };
    acc[month].total += Number(income.amount);
    acc[month].count += 1;
    return acc;
  }, {})).sort((a, b) => b.month.localeCompare(a.month));
  const currentMonthIncome = monthlyRows.find((row) => row.month === (month ?? currentMonth()))?.total ?? 0;
  const totalIncome = incomes.reduce((sum, income) => sum + Number(income.amount), 0);
  const largestMonth = Math.max(0, ...monthlyRows.map((row) => row.total));

  return (
    <div className={styles.page}>
      <PageHeader title="Tekjur" description="Skráðu tekjurnar þínar og berðu þær saman milli mánaða."
        action={<a href="#new-income" className={buttonVariants()}><Plus size={17} aria-hidden="true" />Skrá tekjur</a>} />

      <dl className={`${styles.summary} ${styles.incomeSummary}`} data-scroll-reveal>
        <div><dt>{month ? "Tekjur í völdum mánuði" : "Tekjur í þessum mánuði"}</dt><dd>{money(currentMonthIncome, currency)}</dd><p>{monthLabel(`${month ?? currentMonth()}-01`)}</p></div>
        <div><dt>{month ? "Tekjur á völdu tímabili" : "Skráðar tekjur alls"}</dt><dd>{money(totalIncome, currency)}</dd><p>Fjöldi tekjufærslna: {incomes.length}</p></div>
      </dl>

      <div className={styles.incomeContent}>
        <section className={styles.ledger} aria-labelledby="income-entries-heading">
          <div className={styles.sectionHeading} data-scroll-reveal><div><h2 id="income-entries-heading">Skráðar tekjufærslur</h2><p>Laun og aðrar tekjur. Nýjustu færslurnar birtast fyrst.</p>{month ? <Link href="/income" className={styles.clearFilters}>Sjá öll tímabil</Link> : null}</div><Link href={`/transactions?type=income&${month ? `period=month&month=${month}` : "period=all"}`} className={styles.clearFilters}>Sjá færslur</Link></div>
          {incomes.length ? incomes.map((income) => (
            <article key={income.id} className={styles.incomeRow} data-scroll-reveal>
              <div><h3>{income.note || "Tekjufærsla"}</h3><p>{monthLabel(income.date)} · {income.categories?.name ?? "Óflokkað"}</p></div>
              <strong className={styles.entryAmount} data-income="true">+{money(Number(income.amount), currency)}</strong>
              <ActionForm action={deleteMonthlyIncome}><input type="hidden" name="id" value={income.id} /><Button variant="secondary" className={styles.deleteButton} title="Eyða tekjufærslu" aria-label={`Eyða tekjufærslu: ${income.note || "Tekjufærsla"}`}><Trash2 size={16} aria-hidden="true" /></Button></ActionForm>
            </article>
          )) : <div className={styles.empty} data-scroll-reveal><EmptyState>Engar tekjur fundust. Þú getur skráð tekjur hér fyrir neðan.</EmptyState></div>}
          {incomes.length ? <div className={styles.ledgerFooter}><span>Tekjufærslur: {incomes.length}</span><span>Upphæðir í íslenskum krónum</span></div> : null}
        </section>

        <section className={styles.monthPanel} aria-labelledby="monthly-income-heading">
          <div className={styles.sectionHeading} data-scroll-reveal><div><h2 id="monthly-income-heading">Tekjur eftir mánuðum</h2><p>Skráðar tekjur samtals í hverjum mánuði.</p></div></div>
          {monthlyRows.length ? <div className={styles.monthList}>{monthlyRows.map((row) => (
            <div key={row.month} className={styles.monthRow} data-scroll-reveal>
              <div><h3>{monthLabel(`${row.month}-01`)}</h3><strong>{money(row.total, currency)}</strong></div>
              <div className={styles.monthTrack} aria-hidden="true"><span style={{ width: `${largestMonth > 0 ? Math.max(0, Math.min(100, row.total / largestMonth * 100)) : 0}%` }} /></div>
              <p>Tekjufærslur: {row.count}</p>
            </div>
          ))}</div> : <div className={styles.empty} data-scroll-reveal><EmptyState>Mánaðaryfirlitið birtist þegar þú skráir tekjur.</EmptyState></div>}
        </section>
      </div>

      <section id="new-income" className={styles.newEntry} aria-labelledby="new-income-heading" data-scroll-reveal>
        <div className={styles.sectionHeading}><div><h2 id="new-income-heading">Skrá tekjur</h2><p>Bættu við tekjufærslu fyrir valinn mánuð.</p></div><Plus size={19} aria-hidden="true" /></div>
        <ActionForm resetOnSuccess action={saveMonthlyIncome} className={`${styles.newEntryForm} ${styles.incomeForm}`}>
          <Field label="Mánuður"><DateInput name="month" type="month" defaultValue={month ?? currentMonth()} required /></Field>
          <Field label="Upphæð"><AmountInput className={inputClass} name="amount" step="0.01" min="0.01" placeholder="0 kr." required /></Field>
          <Field label="Flokkur"><select className={inputClass} name="category_id"><option value="">Velja flokk</option>{incomeCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
          <Field label="Lýsing"><input className={inputClass} name="note" placeholder="T.d. laun í september" /></Field>
          <div><Button type="submit"><Plus size={17} aria-hidden="true" />Skrá tekjur</Button></div>
        </ActionForm>
      </section>
    </div>
  );
}
