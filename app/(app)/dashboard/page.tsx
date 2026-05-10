import { CheckCircle2, Circle, PiggyBank, ReceiptText, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { PieBreakdown, TrendChart } from "@/components/charts";
import { Button, Card, EmptyState, PageHeader, ProgressBar } from "@/components/ui";
import { getDashboardData } from "@/lib/data";
import { currentMonth, money, percent } from "@/lib/format";

function monthLabel(month: string) {
  const date = new Date(`${month}-01T00:00:00`);
  return new Intl.DateTimeFormat("is-IS", { month: "long", year: "numeric" }).format(date);
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  const currency = "ISK";
  const month = currentMonth();
  const stats = [
    { label: "Tekjur", value: money(data.income, currency), icon: TrendingUp, valueClassName: "text-moss", iconClassName: "text-moss" },
    { label: "Útgjöld", value: money(data.expenses, currency), icon: TrendingDown, valueClassName: "text-coral", iconClassName: "text-coral" },
    {
      label: "Niðurstaða mánaðar",
      value: money(data.savings, currency),
      icon: PiggyBank,
      valueClassName: data.savings >= 0 ? "text-moss" : "text-coral",
      iconClassName: data.savings >= 0 ? "text-moss" : "text-coral"
    },
    { label: "Ógreiddir reikningar", value: money(data.unpaidBillsTotal, currency), icon: ReceiptText, valueClassName: "text-coral", iconClassName: "text-coral" }
  ];
  const categoryLinks = Object.values(
    data.transactions
      .filter((transaction) => transaction.type === "expense")
      .reduce<Record<string, { id: string | null; name: string; value: number }>>((acc, transaction) => {
        const key = transaction.category_id ?? "unclassified";
        if (!acc[key]) {
          acc[key] = {
            id: transaction.category_id,
            name: transaction.categories?.name ?? "Óflokkað",
            value: 0
          };
        }
        acc[key].value += Number(transaction.amount);
        return acc;
      }, {})
  ).sort((left, right) => right.value - left.value);
  const categoryHrefMap = Object.fromEntries(categoryLinks.filter((item) => item.id).map((item) => [item.name, `/transactions/category/${item.id}?month=${month}&type=expense`]));

  return (
    <>
      <PageHeader
        title="Yfirlit"
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={`/monthly-overview?month=${month}`}>
              <Button type="button" variant="secondary">
                Skoða mánuð
              </Button>
            </Link>
            <Link href={`/bills?month=${month}`}>
              <Button type="button" variant="secondary">
                Reikningar
              </Button>
            </Link>
          </div>
        }
      />

      <Card className="mb-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-ink/55">{monthLabel(month)}</p>
            <h2 className="mt-1 text-xl font-bold">Staða mánaðarins</h2>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-3 lg:min-w-[520px]">
            <div className="rounded-lg border border-line/10 bg-mint/35 p-3">
              <p className="font-semibold text-ink/55">Tekjur</p>
              <p className="mt-1 font-bold text-moss">{money(data.income, currency)}</p>
            </div>
            <div className="rounded-lg border border-line/10 bg-surface/70 p-3">
              <p className="font-semibold text-ink/55">Útgjöld</p>
              <p className="mt-1 font-bold text-coral">{money(data.expenses, currency)}</p>
            </div>
            <div className="rounded-lg border border-line/10 bg-surface/70 p-3">
              <p className="font-semibold text-ink/55">Eftir</p>
              <p className={`mt-1 font-bold ${data.savings >= 0 ? "text-moss" : "text-coral"}`}>{money(data.savings, currency)}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink/55">{stat.label}</p>
                <Icon className={stat.iconClassName} size={20} />
              </div>
              <p className={`mt-3 text-2xl font-bold ${stat.valueClassName}`}>{stat.value}</p>
            </Card>
          );
        })}
      </div>

      <div className="mt-5">
        <Card>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-bold">Heildarsparnaður</h2>
              <p className="text-sm text-ink/55">Raunverulegur sparnaður skiptur eftir tegund.</p>
            </div>
            <p className="text-2xl font-bold text-moss">{money(data.totalSavingsBalance, currency)}</p>
          </div>
          {!data.savingsBucketsReady ? (
            <EmptyState>Keyrðu `supabase/savings-buckets-update.sql` í Supabase til að vista sparnaðarflokkana.</EmptyState>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {data.savingsBuckets.map((bucket) => (
                <div key={bucket.bucket_type} className="rounded-lg border border-line/10 bg-surface/70 p-4">
                  <p className="text-sm font-semibold text-ink/55">{bucket.label}</p>
                  <p className="mt-2 text-xl font-bold">{money(Number(bucket.amount), currency)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <h2 className="mb-4 font-bold">Mánaðarlegar tekjur og útgjöld</h2>
          <TrendChart data={data.trend} height={220} />
        </Card>
        <Card>
          <h2 className="mb-4 font-bold">Útgjöld eftir flokkum</h2>
          {data.spendingByCategory.length ? (
            <div className="space-y-4">
              <PieBreakdown data={data.spendingByCategory} links={categoryHrefMap} />
              <div className="grid gap-2">
                {categoryLinks.map((item) =>
                  item.id ? (
                    <Link
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-line/10 bg-surface/70 px-3 py-2 text-sm font-semibold text-moss transition hover:bg-mint/35"
                      href={`/transactions/category/${item.id}?month=${month}&type=expense`}
                    >
                      <span>{item.name}</span>
                      <span>{money(item.value, currency)}</span>
                    </Link>
                  ) : (
                    <div key={item.name} className="flex items-center justify-between rounded-lg border border-line/10 bg-surface/60 px-3 py-2 text-sm text-ink/60">
                      <span>{item.name}</span>
                      <span>{money(item.value, currency)}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          ) : (
            <EmptyState>Engin útgjöld í þessum mánuði.</EmptyState>
          )}
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-bold">Reikningar mánaðarins</h2>
            <Link className="text-sm font-semibold text-moss underline-offset-2 hover:underline" href={`/bills?month=${month}`}>
              Opna
            </Link>
          </div>
          {!data.billsReady ? (
            <EmptyState>Reikningataflan er ekki virk í Supabase enn.</EmptyState>
          ) : data.activeBills.length ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-line/10 bg-surface/70 p-3">
                  <p className="text-sm font-semibold text-ink/55">Greitt</p>
                  <p className="mt-1 font-bold text-moss">{money(data.paidBillsTotal, currency)}</p>
                </div>
                <div className="rounded-lg border border-line/10 bg-surface/70 p-3">
                  <p className="text-sm font-semibold text-ink/55">Ógreitt</p>
                  <p className="mt-1 font-bold text-coral">{money(data.unpaidBillsTotal, currency)}</p>
                </div>
                <div className="rounded-lg border border-line/10 bg-surface/70 p-3">
                  <p className="text-sm font-semibold text-ink/55">Staða</p>
                  <p className="mt-1 font-bold">
                    {data.paidBills.length}/{data.activeBills.length}
                  </p>
                </div>
              </div>
              <div className="divide-y divide-line/10">
                {data.activeBills.slice(0, 4).map((bill) => (
                  <Link key={bill.id} href={`/bills?month=${month}`} className="flex items-center justify-between gap-3 py-3 text-sm hover:text-moss">
                    <span className="flex min-w-0 items-center gap-2">
                      {bill.payment ? <CheckCircle2 className="shrink-0 text-moss" size={17} /> : <Circle className="shrink-0 text-ink/35" size={17} />}
                      <span className="truncate font-semibold">{bill.name}</span>
                    </span>
                    <span className={bill.payment ? "shrink-0 font-bold text-moss" : "shrink-0 font-bold text-coral"}>
                      {money(Number(bill.payment?.amount ?? bill.amount), currency)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState>Engir virkir reikningar skráðir.</EmptyState>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-bold">Staða sparnaðarmarkmiðs</h2>
          <div className="space-y-4">
            {data.goals.length ? (
              data.goals.slice(0, 1).map((goal) => {
                const currentAmount = data.totalSavingsBalance;
                const progress = (currentAmount / Number(goal.target_amount)) * 100;
                const remaining = Math.max(0, Number(goal.target_amount) - currentAmount);

                return (
                  <div key={goal.id}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{goal.title}</span>
                      <span>{percent(progress)}</span>
                    </div>
                    <div className="mb-2 flex justify-between text-xs text-ink/55">
                      <span>{money(currentAmount, currency)}</span>
                      <span>{money(remaining, currency)} eftir</span>
                    </div>
                    <ProgressBar value={progress} />
                  </div>
                );
              })
            ) : (
              <EmptyState>Engin sparnaðarmarkmið enn.</EmptyState>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-5">
        <Card>
          <h2 className="mb-4 font-bold">Nýlegar færslur</h2>
          {data.transactions.length ? (
            <div className="divide-y divide-line/10">
              {data.transactions.slice(0, 6).map((tx) => (
                <div key={tx.id} className="flex justify-between gap-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{tx.note || "Færsla"}</p>
                    {tx.category_id ? (
                      <Link className="text-moss underline-offset-2 hover:underline" href={`/transactions/category/${tx.category_id}?month=${month}&type=${tx.type}`}>
                        {tx.categories?.name ?? "Óflokkað"}
                      </Link>
                    ) : (
                      <p className="text-ink/55">{tx.categories?.name ?? "Óflokkað"}</p>
                    )}
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
