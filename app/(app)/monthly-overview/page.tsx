import { CalendarDays, CheckCircle2, Circle, PiggyBank, ReceiptText, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { CategoryBars, PieBreakdown } from "@/components/charts";
import { Card, EmptyState, Field, PageHeader, ProgressBar, inputClass } from "@/components/ui";
import { getMonthlyOverviewData, getOverviewMonths } from "@/lib/data";
import { currentMonth, money, percent } from "@/lib/format";

function monthLabel(month: string) {
  const date = new Date(`${month}-01T00:00:00`);
  return new Intl.DateTimeFormat("is-IS", { month: "long", year: "numeric" }).format(date);
}

export default async function MonthlyOverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const month = params.month ?? currentMonth();
  const [data, months] = await Promise.all([getMonthlyOverviewData(month), getOverviewMonths()]);
  const currency = "ISK";
  const budgetAmount = data.overallBudget ? Number(data.overallBudget.amount) : data.budgeted;
  const budgetUsage = budgetAmount > 0 ? (data.expenses / budgetAmount) * 100 : 0;
  const categoryLinks = Object.fromEntries(
    data.expenseTransactions
      .filter((transaction) => transaction.category_id && transaction.categories?.name)
      .map((transaction) => [transaction.categories?.name, `/transactions/category/${transaction.category_id}?month=${month}&type=expense`])
  );
  const stats = [
    { label: "Tekjur", value: money(data.income, currency), icon: TrendingUp, color: "text-moss" },
    { label: "Útgjöld", value: money(data.expenses, currency), icon: TrendingDown, color: "text-coral" },
    { label: "Niðurstaða", value: money(data.savings, currency), icon: PiggyBank, color: data.savings >= 0 ? "text-moss" : "text-coral" },
    { label: "Færslur", value: String(data.transactions.length), icon: ReceiptText, color: "text-ink" }
  ];

  return (
    <>
      <PageHeader title="Mánaðaryfirlit" />

      <Card className="mb-5">
        <form className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field label="Mánuður">
            <select className={inputClass} name="month" defaultValue={month}>
              {months.includes(month) ? null : <option value={month}>{monthLabel(month)}</option>}
              {months.map((item) => (
                <option key={item} value={item}>
                  {monthLabel(item)}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end">
            <button className="focus-ring min-h-10 w-full rounded-md border border-line/10 bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-mint/35 sm:w-auto" type="submit">
              Skoða
            </button>
          </div>
        </form>
      </Card>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink/55">{stat.label}</p>
                <Icon className={stat.color} size={20} />
              </div>
              <p className={`mt-3 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </Card>
          );
        })}
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays size={18} className="text-moss" />
            <h2 className="font-bold">{monthLabel(month)}</h2>
          </div>
          <div className="grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-ink/55">Heildartekjur</span>
              <span className="font-bold text-moss">{money(data.income, currency)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-ink/55">Heildarútgjöld</span>
              <span className="font-bold text-coral">{money(data.expenses, currency)}</span>
            </div>
            <div className="flex justify-between gap-4 border-t border-line/10 pt-3">
              <span className="text-ink/55">Eftir mánuðinn</span>
              <span className={`font-bold ${data.savings >= 0 ? "text-moss" : "text-coral"}`}>{money(data.savings, currency)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-ink/55">Sparnaðarfærslur</span>
              <span className="font-bold">{money(data.savingsContributed, currency)}</span>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-bold">Áætlun mánaðar</h2>
          {budgetAmount > 0 ? (
            <>
              <div className="mb-2 flex justify-between text-sm">
                <span>{money(data.expenses, currency)} notað</span>
                <span>{money(budgetAmount, currency)} áætlað</span>
              </div>
              <ProgressBar value={budgetUsage} />
              <div className="mt-3 flex justify-between text-sm text-ink/55">
                <span>{percent(budgetUsage)}</span>
                <span className={budgetUsage > 100 ? "font-semibold text-coral" : "font-semibold text-moss"}>
                  {budgetUsage > 100 ? "Yfir áætlun" : `${money(Math.max(0, budgetAmount - data.expenses), currency)} eftir`}
                </span>
              </div>
            </>
          ) : (
            <EmptyState>Engin áætlun skráð fyrir þennan mánuð.</EmptyState>
          )}
        </Card>
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-bold">Útgjöld eftir flokkum</h2>
          {data.spendingByCategory.length ? <PieBreakdown data={data.spendingByCategory} links={categoryLinks} /> : <EmptyState>Engin útgjöld í þessum mánuði.</EmptyState>}
        </Card>
        <Card>
          <h2 className="mb-4 font-bold">Tekjur eftir flokkum</h2>
          {data.incomeByCategory.length ? <CategoryBars data={data.incomeByCategory.slice(0, 8)} /> : <EmptyState>Engar tekjur í þessum mánuði.</EmptyState>}
        </Card>
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-bold">Reikningar</h2>
          {!data.billsReady ? (
            <EmptyState>Reikningataflan er ekki virk í Supabase enn.</EmptyState>
          ) : data.bills.length ? (
            <div className="grid gap-2">
              {data.bills.map((bill) => (
                <Link
                  key={bill.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line/10 bg-surface/70 px-3 py-2 text-sm transition hover:bg-mint/35"
                  href={`/bills?month=${month}`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {bill.payment ? <CheckCircle2 className="shrink-0 text-moss" size={17} /> : <Circle className="shrink-0 text-ink/35" size={17} />}
                    <span className="truncate font-semibold">{bill.name}</span>
                  </span>
                  <span className={bill.payment ? "font-bold text-moss" : "font-bold text-coral"}>
                    {money(Number(bill.payment?.amount ?? bill.amount), currency)}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState>Engir reikningar skráðir.</EmptyState>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-bold">Nýlegar færslur</h2>
          {data.transactions.length ? (
            <div className="divide-y divide-line/10">
              {data.transactions.slice(0, 8).map((tx) => (
                <div key={tx.id} className="flex justify-between gap-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{tx.note || "Færsla"}</p>
                    <p className="text-ink/55">{tx.date} · {tx.categories?.name ?? "Óflokkað"}</p>
                  </div>
                  <p className={tx.type === "income" ? "shrink-0 font-bold text-moss" : "shrink-0 font-bold text-coral"}>
                    {tx.type === "income" ? "+" : "-"}
                    {money(Number(tx.amount), currency)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>Engar færslur í þessum mánuði.</EmptyState>
          )}
        </Card>
      </div>
    </>
  );
}
