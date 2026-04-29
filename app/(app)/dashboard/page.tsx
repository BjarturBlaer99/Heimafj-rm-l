import { PiggyBank, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { PieBreakdown, TrendChart } from "@/components/charts";
import { Card, EmptyState, PageHeader, ProgressBar } from "@/components/ui";
import { getDashboardData } from "@/lib/data";
import { currentMonth, money, percent } from "@/lib/format";

export default async function DashboardPage() {
  const data = await getDashboardData();
  const currency = "ISK";
  const month = currentMonth();
  const stats = [
    { label: "Tekjur", value: money(data.income, currency), icon: TrendingUp, valueClassName: "text-moss", iconClassName: "text-moss" },
    { label: "Útgjöld", value: money(data.expenses, currency), icon: TrendingDown, valueClassName: "text-coral", iconClassName: "text-coral" },
    { label: "Sparnaður í mánuðinum", value: money(data.savings, currency), icon: PiggyBank, valueClassName: "text-moss", iconClassName: "text-moss" }
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
      <PageHeader title="Yfirlit" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <div className="flex items-center justify-between">
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

        <Card>
          <h2 className="mb-4 font-bold">Nýlegar færslur</h2>
          <div className="divide-y divide-line/10">
            {data.transactions.slice(0, 6).map((tx) => (
              <div key={tx.id} className="flex justify-between py-3 text-sm">
                <div>
                  <p className="font-semibold">{tx.note || "Færsla"}</p>
                  {tx.category_id ? (
                    <Link className="text-moss underline-offset-2 hover:underline" href={`/transactions/category/${tx.category_id}?month=${month}&type=${tx.type}`}>
                      {tx.categories?.name ?? "Óflokkað"}
                    </Link>
                  ) : (
                    <p className="text-ink/55">{tx.categories?.name ?? "Óflokkað"}</p>
                  )}
                </div>
                <p className={tx.type === "income" ? "font-bold text-moss" : "font-bold text-coral"}>
                  {tx.type === "income" ? "+" : "-"}
                  {money(Number(tx.amount), currency)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
