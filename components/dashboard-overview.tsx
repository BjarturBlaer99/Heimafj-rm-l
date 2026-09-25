import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { DashboardCashflow } from "@/components/dashboard-cashflow";
import type { getDashboardData } from "@/lib/data";
import { money, percent } from "@/lib/format";
import styles from "@/app/(app)/dashboard/dashboard.module.css";

function dateLabel(date: string, options: Intl.DateTimeFormatOptions) {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  const short = ["jan.", "feb.", "mar.", "apr.", "maí", "jún.", "júl.", "ágú.", "sep.", "okt.", "nóv.", "des."][month - 1];
  const full = ["janúar", "febrúar", "mars", "apríl", "maí", "júní", "júlí", "ágúst", "september", "október", "nóvember", "desember"][month - 1];
  return options.day ? `${day}. ${short}` : options.year ? `${full} ${year}` : short;
}

function SectionHeading({ id, title, href, linkText = "Sjá allt", onNavigate }: { id: string; title: string; href: string; linkText?: string; onNavigate?: (href: string) => void }) {
  return <div className={styles.sectionHeading}>
    <h2 id={id}>{title}</h2>
    <DashboardLink onNavigate={onNavigate} href={href} className={styles.textLink}>{linkText}<ArrowRightIcon size={15} aria-hidden="true" /></DashboardLink>
  </div>;
}

export type DashboardOverviewData = Awaited<ReturnType<typeof getDashboardData>>;

function DashboardLink({ href, onNavigate, children, ...props }: Omit<ComponentProps<"a">, "href" | "onClick"> & { href: string; onNavigate?: (href: string) => void }) {
  if (onNavigate) return <button type="button" onClick={() => onNavigate(href)} className={props.className} aria-label={props["aria-label"]}>{children}</button>;
  return <Link href={href} {...props}>{children}</Link>;
}

export function DashboardOverview({ data, month, today, onNavigate, marketContent, setupContent }: {
  data: DashboardOverviewData;
  month: string;
  today: string;
  onNavigate?: (href: string) => void;
  marketContent?: ReactNode;
  setupContent?: ReactNode;
}) {
  const currency = "ISK";
  const name = data.profile?.full_name?.trim().split(/\s+/)[0];
  const monthName = dateLabel(`${month}-01`, { month: "long", year: "numeric" });
  const shortMonth = dateLabel(`${month}-01`, { month: "short" });
  const hasTransactions = data.transactions.length > 0;
  const expenseShare = data.income > 0 ? data.expenses / data.income * 100 : null;
  const unpaidBills = [...data.unpaidBills].sort((a, b) => Number(a.due_day) - Number(b.due_day));
  const lastDay = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  const primaryGoal = data.goals.find((goal) => Number(goal.target_amount) > 0);
  const goalProgress = primaryGoal ? data.goalSavingsBalance / Number(primaryGoal.target_amount) * 100 : 0;
  const overallBudget = data.budgets.find((budget) => !budget.category_id);
  const categoryTotals = Object.values(data.transactions.filter((tx) => tx.type === "expense").reduce<Record<string, { id: string | null; name: string; amount: number }>>((totals, tx) => {
    const key = tx.category_id ?? "unclassified";
    totals[key] ??= { id: tx.category_id, name: tx.categories?.name ?? "Óflokkað", amount: 0 };
    totals[key].amount += Number(tx.amount);
    return totals;
  }, {})).sort((a, b) => b.amount - a.amount);

  return (
    <div className={styles.dashboard}>
      <header data-scroll-reveal="" className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Yfirlit <span aria-hidden="true">/</span> {monthName}</p>
          <h1>Góðan daginn{name ? `, ${name}` : ""}.</h1>
          <p className={styles.intro}>Hér sérðu stöðuna í þessum mánuði.</p>
        </div>
        <DashboardLink onNavigate={onNavigate} className={styles.primaryAction} href="/transactions#new-transaction"><PlusIcon size={18} aria-hidden="true" />Ný færsla</DashboardLink>
      </header>

      <div className={styles.overview}>
        <section data-scroll-reveal="" className={styles.position} aria-labelledby="monthly-position-title">
          <div className={styles.positionHeading}>
            <h2 id="monthly-position-title">Afkoma mánaðarins</h2>
            <DashboardLink onNavigate={onNavigate} href={`/monthly-overview?month=${month}`} className={styles.iconLink} aria-label="Skoða mánaðaryfirlit"><ArrowUpRightIcon size={21} aria-hidden="true" /></DashboardLink>
          </div>
          <p className={styles.positionValue} data-negative={data.savings < 0} data-testid="monthly-position">{hasTransactions ? money(data.savings, currency) : "—"}</p>
          <p className={styles.positionDescription}>{hasTransactions ? "Tekjur að frádregnum skráðum útgjöldum." : "Skráðu fyrstu færsluna til að sjá afkomu mánaðarins."}</p>
          <dl className={styles.monthlyTotals}>
            <div><dt><span className={styles.incomeDot} />Tekjur</dt><dd><DashboardLink onNavigate={onNavigate} href={`/income?month=${month}`}>{money(data.income, currency)}</DashboardLink></dd></div>
            <div><dt><span className={styles.expenseDot} />Útgjöld</dt><dd><DashboardLink onNavigate={onNavigate} href={`/expenses?month=${month}`}>{money(data.expenses, currency)}</DashboardLink></dd></div>
          </dl>
          {expenseShare !== null ? <div className={styles.spendingRatio}>
            <div className={styles.ratioTrack} aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(100, expenseShare))}%` }} data-negative={expenseShare > 100} /></div>
            <p><strong>{percent(expenseShare)}</strong> tekna fara í skráð útgjöld.</p>
          </div> : <DashboardLink onNavigate={onNavigate} className={styles.textLink} href={hasTransactions ? "/income" : "/transactions#import-transactions"}>{hasTransactions ? "Skrá tekjur mánaðarins" : "Flytja inn fyrstu færslurnar"}<ArrowRightIcon size={15} aria-hidden="true" /></DashboardLink>}
          <p className={styles.positionNote}>Ógreiddir reikningar eru ekki dregnir frá þessari upphæð.</p>
        </section>

        <section data-scroll-reveal="" className={styles.bills} aria-labelledby="unpaid-bills-title">
          <div className={styles.sectionHeading}><h2 id="unpaid-bills-title">Ógreiddir reikningar</h2>{data.billsReady && <span className={styles.count}>{unpaidBills.length}</span>}</div>
          {!data.billsReady ? <p className={styles.empty}>Ekki tókst að sækja reikningana.</p> : unpaidBills.length ? <>
            <p className={styles.billsTotal}>{money(data.unpaidBillsTotal, currency)} <span>alls í {monthName.split(" ")[0]}</span></p>
            <div className={styles.billList}>{unpaidBills.slice(0, 3).map((bill) => {
              const dueDay = Math.min(Number(bill.due_day), lastDay);
              const dueDate = `${month}-${String(dueDay).padStart(2, "0")}`;
              return <DashboardLink onNavigate={onNavigate} className={styles.billRow} href={`/bills?month=${month}`} key={bill.id}>
                <time className={styles.dueDate} dateTime={dueDate}><strong>{dueDay}</strong><span>{shortMonth}</span></time>
                <div className={styles.billInfo}><p>{bill.name}</p><span className={dueDate < today ? styles.overdue : styles.muted}>{dueDate < today ? "Gjalddagi liðinn" : dueDate === today ? "Gjalddagi í dag" : "Ógreitt"}</span></div>
                <span className={styles.billAmount}>{money(Number(bill.amount), currency)}</span>
              </DashboardLink>;
            })}</div>
          </> : <div className={styles.billsEmpty}>
            <CheckIcon size={24} className={styles.success} aria-hidden="true" />
            <p>{data.activeBills.length ? "Allir skráðir reikningar mánaðarins eru greiddir." : "Engir reikningar skráðir enn."}</p>
            <span>{data.activeBills.length ? "Engir skráðir reikningar bíða greiðslu í þessum mánuði." : "Bættu við reikningum til að fylgjast með gjalddögum."}</span>
          </div>}
          <div className={styles.billsFooter}>
            {data.billsReady && data.activeBills.length > 0 && <span>{data.paidBills.length} af {data.activeBills.length} greiddir</span>}
            <DashboardLink onNavigate={onNavigate} className={styles.textLink} href={`/bills?month=${month}`}>{unpaidBills.length > 3 ? "Sjá alla reikninga" : "Opna reikninga"}<ArrowRightIcon size={15} aria-hidden="true" /></DashboardLink>
          </div>
        </section>
      </div>

      <div className={styles.activityGrid}>
        <section data-scroll-reveal="" className={styles.section} aria-labelledby="recent-transactions-title">
          <SectionHeading onNavigate={onNavigate} id="recent-transactions-title" title="Nýlegar færslur" href={`/transactions?month=${month}`} linkText="Allar færslur" />
          {hasTransactions ? <div className={styles.transactionList}>{data.transactions.slice(0, 6).map((tx) => <DashboardLink onNavigate={onNavigate} className={styles.transaction} href={`/transactions?month=${tx.date.slice(0, 7)}&id=${encodeURIComponent(tx.id)}#transaction-${encodeURIComponent(tx.id)}`} key={tx.id}>
            <div className={styles.transactionName}><p>{tx.note || (tx.type === "income" ? "Tekjufærsla" : "Útgjaldafærsla")}</p><span>{tx.categories?.name ?? "Óflokkað"}</span></div>
            <time dateTime={tx.date}>{dateLabel(tx.date, { day: "numeric", month: "short" })}</time>
            <strong className={tx.type === "income" ? styles.success : undefined}>{tx.type === "income" ? "+" : "−"}{money(Number(tx.amount), currency)}</strong>
          </DashboardLink>)}</div> : <div className={styles.empty}><p>Engar færslur í þessum mánuði.</p><DashboardLink onNavigate={onNavigate} className={styles.textLink} href="/transactions">Skrá fyrstu færsluna<ArrowRightIcon size={15} aria-hidden="true" /></DashboardLink></div>}
        </section>

        <section data-scroll-reveal="" className={styles.section} aria-labelledby="spending-title">
          <SectionHeading onNavigate={onNavigate} id="spending-title" title="Hvert fara peningarnir?" href={`/expenses?month=${month}`} linkText="Útgjöld" />
          <p className={styles.sectionDescription}>Stærstu útgjaldaflokkar mánaðarins.</p>
          {categoryTotals.length ? <ol className={styles.categories}>{categoryTotals.slice(0, 4).map((category, index) => <li key={category.id ?? "unclassified"}>
            <DashboardLink onNavigate={onNavigate} href={category.id ? `/transactions/category/${category.id}?month=${month}&type=expense` : `/transactions?month=${month}&type=expense`}>
              <span className={styles.categoryRank}>{String(index + 1).padStart(2, "0")}</span>
              <div className={styles.categoryContent}><div><span>{category.name}</span><strong>{money(category.amount, currency)}</strong></div><div className={styles.categoryTrack} aria-hidden="true"><span style={{ width: `${data.expenses > 0 ? category.amount / data.expenses * 100 : 0}%` }} /></div></div>
            </DashboardLink>
          </li>)}</ol> : <p className={styles.empty}>Útgjaldaflokkar birtast þegar þú skráir útgjöld.</p>}
          <div className={styles.budgetNote}>{overallBudget ? <><span>Útgjaldaáætlun mánaðarins</span><strong>{money(Number(overallBudget.amount), currency)}</strong></> : <DashboardLink onNavigate={onNavigate} className={styles.textLink} href="/expenses">Setja útgjaldaáætlun<ArrowRightIcon size={15} aria-hidden="true" /></DashboardLink>}</div>
        </section>
      </div>

      {setupContent}

      <div className={styles.detailGrid}>
        <section data-scroll-reveal="" className={styles.section} aria-labelledby="cashflow-title">
          <SectionHeading onNavigate={onNavigate} id="cashflow-title" title="Mánuður fyrir mánuð" href="/analytics" linkText="Greining" />
          <p className={styles.sectionDescription}>Tekjur og útgjöld síðustu sex mánaða.</p>
          <DashboardCashflow data={data.trend} currency={currency} />
        </section>
        <section data-scroll-reveal="" className={`${styles.section} ${styles.savings}`} aria-labelledby="savings-title">
          <SectionHeading onNavigate={onNavigate} id="savings-title" title="Sparnaðurinn þinn" href="/savings-goals" linkText="Opna" />
          {!data.savingsBucketsReady ? <p className={styles.empty}>Ekki tókst að sækja stöðu sparnaðarins.</p> : <>
            <p className={styles.savingsTotal}>{money(data.totalSavingsBalance, currency)}</p>
            <p className={styles.sectionDescription}>Heildarsparnaður í skráðum flokkum.</p>
            {primaryGoal ? <div className={styles.goal}>
              <div><h3>{primaryGoal.title}</h3><span>{percent(goalProgress)}</span></div>
              <div className={styles.goalTrack} role="progressbar" aria-label={primaryGoal.title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.max(0, Math.min(100, goalProgress)))} aria-valuetext={`${percent(goalProgress)} af ${money(Number(primaryGoal.target_amount), currency)}`}><span style={{ width: `${Math.max(0, Math.min(100, goalProgress))}%` }} /></div>
              <p>{goalProgress >= 100 ? "Þú hefur náð markupphæðinni miðað við valda sparnaðarflokka." : `${money(Math.max(0, Number(primaryGoal.target_amount) - data.goalSavingsBalance), currency)} eftir að spara í völdum flokkum.`}</p>
            </div> : <DashboardLink onNavigate={onNavigate} className={styles.textLink} href="/savings-goals">Setja sparnaðarmarkmið<ArrowRightIcon size={15} aria-hidden="true" /></DashboardLink>}
            <dl className={styles.buckets}>{data.savingsBuckets.map((bucket) => <div key={bucket.bucket_type}><dt>{bucket.label}</dt><dd>{money(Number(bucket.amount), currency)}</dd></div>)}</dl>
          </>}
        </section>
      </div>

      <section className={styles.markets} aria-labelledby="dashboard-markets-title">
        <header data-scroll-reveal="" className={styles.marketHeading}><h2 id="dashboard-markets-title">Markaðir og efnahagur</h2><p className={styles.marketHint}>Vextir, verðbólga og gengi</p></header>
        <div>{marketContent}</div>
      </section>
    </div>
  );
}
