import { ArrowUpRightIcon as ArrowUpRight } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { CheckCircleIcon as CheckCircle2 } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { CircleIcon as Circle } from "@phosphor-icons/react/dist/ssr/Circle";
import { ListChecksIcon as ListChecks } from "@phosphor-icons/react/dist/ssr/ListChecks";
import { PiggyBankIcon as PiggyBank } from "@phosphor-icons/react/dist/ssr/PiggyBank";
import { ReceiptIcon as ReceiptText } from "@phosphor-icons/react/dist/ssr/Receipt";
import { TagIcon as Tags } from "@phosphor-icons/react/dist/ssr/Tag";
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
  const topCategory = categoryLinks[0] ?? null;
  const stats = [
    {
      label: "Heildarsparnaður",
      value: money(data.totalSavingsBalance, currency),
      href: "/savings-goals",
      icon: PiggyBank,
      valueClassName: "text-ink"
    },
    {
      label: "Ógreiddir reikningar",
      value: money(data.unpaidBillsTotal, currency),
      href: `/bills?month=${month}`,
      icon: ReceiptText,
      valueClassName: data.unpaidBillsTotal > 0 ? "text-coral" : "text-ink"
    },
    {
      label: "Færslur í mánuðinum",
      value: data.transactions.length.toLocaleString("is-IS"),
      href: `/transactions?month=${month}`,
      icon: ListChecks,
      valueClassName: "text-ink"
    },
    {
      label: "Stærsti útgjaldaflokkur",
      value: topCategory?.name ?? "Enginn",
      href: topCategory?.id ? `/transactions/category/${topCategory.id}?month=${month}&type=expense` : `/expenses?month=${month}`,
      icon: Tags,
      valueClassName: "text-ink"
    }
  ];

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

      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(440px,0.85fr)]">
      <section className="animate-rise min-h-[280px] overflow-hidden rounded-lg border border-[#273244] bg-[#111827] p-5 text-white shadow-soft sm:p-6 dark:border-white/10 dark:bg-[#0f131a]">
        <div className="grid h-full gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] md:items-end">
          <div>
            <p className="text-sm font-semibold text-white/55">{monthLabel(month)}</p>
            <p className="mt-5 text-sm font-medium text-white/65">Eftir mánuðinn</p>
            <Link href={`/monthly-overview?month=${month}`} className="focus-ring mt-1 inline-flex max-w-full items-center gap-2 rounded-md text-white transition hover:text-white/80">
              <span className="break-words text-3xl font-semibold leading-tight sm:text-4xl">{money(data.savings, currency)}</span>
              <ArrowUpRight className="shrink-0 text-white/50" size={22} />
            </Link>
            <p className="mt-2 text-sm text-white/45">Tekjur að frádregnum útgjöldum þessa mánaðar.</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Link href={`/income?month=${month}`} className="rounded-lg border border-white/10 bg-white/[0.055] p-4 transition hover:bg-white/[0.09]">
              <p className="text-xs font-semibold text-white/50">Tekjur</p>
              <p className="mt-2 text-lg font-semibold text-white">{money(data.income, currency)}</p>
            </Link>
            <Link href={`/expenses?month=${month}`} className="rounded-lg border border-white/10 bg-white/[0.055] p-4 transition hover:bg-white/[0.09]">
              <p className="text-xs font-semibold text-white/50">Útgjöld</p>
              <p className="mt-2 text-lg font-semibold text-white">{money(data.expenses, currency)}</p>
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-2">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href} className="block">
              <Card className={`motion-card animate-rise animate-delay-${Math.min(index + 1, 4)} min-h-[132px] h-full transition hover:border-line/20`}>
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-muted text-ink/55">
                    <Icon size={18} />
                  </span>
                  <ArrowUpRight className="shrink-0 text-ink/25" size={17} />
                </div>
                <p className="mt-4 text-sm font-medium text-ink/55">{stat.label}</p>
                <p className={`mt-1 break-words text-xl font-semibold leading-tight ${stat.valueClassName}`}>{stat.value}</p>
              </Card>
            </Link>
          );
        })}
      </div>
      </div>

      <div className="mt-6 grid gap-6">
      <div className="animate-rise animate-delay-2">
        <Link href="/savings-goals" className="block">
        <Card className="motion-card transition hover:border-line/20 hover:bg-muted/60">
          <div className="mb-5 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div>
              <h2 className="font-bold">Heildarsparnaður</h2>
              <p className="text-sm text-ink/55">Raunverulegur sparnaður skiptur eftir tegund.</p>
            </div>
            <p className="shrink-0 text-2xl font-semibold text-moss">{money(data.totalSavingsBalance, currency)}</p>
          </div>
          {!data.savingsBucketsReady ? (
            <EmptyState>Keyrðu `supabase/savings-buckets-update.sql` í Supabase til að vista sparnaðarflokkana.</EmptyState>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {data.savingsBuckets.map((bucket) => (
                <div key={bucket.bucket_type} className="rounded-lg border border-line/10 bg-surface/70 p-4">
                  <p className="text-sm font-semibold text-ink/55">{bucket.label}</p>
                  <p className="mt-2 text-xl font-bold">{money(Number(bucket.amount), currency)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
        </Link>
      </div>

      <div className="animate-rise animate-delay-3 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Link href={`/monthly-overview?month=${month}`} className="block h-full">
          <Card className="motion-card h-full transition hover:border-line/20 hover:bg-muted/60">
            <h2 className="mb-4 font-bold">Mánaðarlegar tekjur og útgjöld</h2>
            <TrendChart data={data.trend} height={220} />
          </Card>
        </Link>
        <Card className="motion-card h-full">
          <h2 className="mb-4 font-bold">Útgjöld eftir flokkum</h2>
          {data.spendingByCategory.length ? (
            <PieBreakdown data={data.spendingByCategory} links={categoryHrefMap} />
          ) : (
            <EmptyState>Engin útgjöld í þessum mánuði.</EmptyState>
          )}
        </Card>
      </div>

      <div className="animate-rise animate-delay-4 grid gap-6 lg:grid-cols-2">
        <Card className="motion-card">
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

        <Link href="/savings-goals" className="block">
        <Card className="motion-card h-full transition hover:border-line/20 hover:bg-muted/60">
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
        </Link>
      </div>

      <div className="animate-rise animate-delay-4">
        <Card className="motion-card">
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
      </div>
    </>
  );
}
