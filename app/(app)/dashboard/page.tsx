import { ArrowUpRightIcon as ArrowUpRight } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { CheckCircleIcon as CheckCircle2 } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { CircleIcon as Circle } from "@phosphor-icons/react/dist/ssr/Circle";
import { ListChecksIcon as ListChecks } from "@phosphor-icons/react/dist/ssr/ListChecks";
import { PiggyBankIcon as PiggyBank } from "@phosphor-icons/react/dist/ssr/PiggyBank";
import { ReceiptIcon as ReceiptText } from "@phosphor-icons/react/dist/ssr/Receipt";
import { TagIcon as Tags } from "@phosphor-icons/react/dist/ssr/Tag";
import Link from "next/link";
import { PieBreakdown, Sparkline, TrendChart } from "@/components/charts";
import { MarketOverview } from "@/components/market-overview";
import { Button, Card, EmptyState, ProgressBar } from "@/components/ui";
import { getDashboardData } from "@/lib/data";
import { currentMonth, money, percent } from "@/lib/format";
import { getMarketSnapshot } from "@/lib/market-data";

function monthLabel(month: string) {
  const date = new Date(`${month}-01T00:00:00`);
  return new Intl.DateTimeFormat("is-IS", { month: "long", year: "numeric" }).format(date);
}

function clamp(value: number) {
  return Math.max(0, Math.min(value, 100));
}

function MetricBar({ label, value, detail, danger = false }: { label: string; value: number; detail: string; danger?: boolean }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-ink/55">{label}</span>
        <span className="font-semibold text-ink/75">{detail}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line/10">
        <div className={`h-full rounded-full ${danger ? "bg-coral" : "bg-accent"}`} style={{ width: `${clamp(value)}%` }} />
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const [data, marketData] = await Promise.all([getDashboardData(), getMarketSnapshot()]);
  const currency = data.profile?.currency ?? "ISK";
  const month = currentMonth();
  const displayName = data.profile?.full_name?.trim() ?? "";
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
  const savingsRate = data.income > 0 ? (data.savings / data.income) * 100 : 0;
  const billsProgress = data.activeBills.length ? (data.paidBills.length / data.activeBills.length) * 100 : 100;
  const budgetUsage = data.budgeted > 0 ? (data.expenses / data.budgeted) * 100 : 0;
  const primaryGoal = data.goals[0] ?? null;
  const goalProgress = primaryGoal ? (data.totalSavingsBalance / Number(primaryGoal.target_amount)) * 100 : 0;
  const positiveMonth = data.savings >= 0;
  const monthBalanceTone = data.savings > 0 ? "text-moss" : data.savings < 0 ? "text-coral" : "text-ink";
  const monthBalanceColor = data.savings > 0
    ? "rgb(var(--color-moss))"
    : data.savings < 0
      ? "rgb(var(--color-coral))"
      : "rgb(var(--color-ink))";
  const financialStatus = positiveMonth && data.unpaidBillsTotal === 0 ? "Mjög góð" : positiveMonth ? "Góð" : "Þarf athygli";
  const statusClass = positiveMonth ? "border-moss/20 bg-moss/10 text-moss" : "border-coral/20 bg-coral/10 text-coral";

  const overviewStats = [
    {
      label: "Heildarsparnaður",
      value: money(data.totalSavingsBalance, currency),
      detail: data.savingsBucketsReady ? `${data.savingsBuckets.length} sparnaðarflokkar` : "Sparnaðaryfirlit",
      href: "/savings-goals",
      icon: PiggyBank,
      tone: "bg-lagoon/10 text-lagoon"
    },
    {
      label: "Ógreiddir reikningar",
      value: data.unpaidBillsTotal > 0 ? money(data.unpaidBillsTotal, currency) : "Engir ógreiddir",
      detail: `${data.paidBills.length}/${data.activeBills.length} greiddir`,
      href: `/bills?month=${month}`,
      icon: ReceiptText,
      tone: data.unpaidBillsTotal > 0 ? "bg-coral/10 text-coral" : "bg-moss/10 text-moss"
    },
    {
      label: "Stærsti útgjaldaflokkur",
      value: topCategory?.name ?? "Enginn",
      detail: topCategory ? money(topCategory.value, currency) : "Engin útgjöld",
      href: topCategory?.id ? `/transactions/category/${topCategory.id}?month=${month}&type=expense` : `/expenses?month=${month}`,
      icon: Tags,
      tone: "bg-gold/10 text-gold"
    },
    {
      label: "Færslur mánaðarins",
      value: data.transactions.length.toLocaleString("is-IS"),
      detail: monthLabel(month),
      href: `/transactions?month=${month}`,
      icon: ListChecks,
      tone: "bg-accent/10 text-accent"
    }
  ];

  const monthlyStats = [
    {
      label: "Heildartekjur",
      value: money(data.income, currency),
      href: `/income?month=${month}`,
      dataKey: "income",
      color: "rgb(var(--color-moss))",
      icon: ArrowUpRight,
      tone: "text-moss"
    },
    {
      label: "Heildarútgjöld",
      value: money(data.expenses, currency),
      href: `/expenses?month=${month}`,
      dataKey: "expenses",
      color: "rgb(var(--color-coral))",
      icon: ReceiptText,
      tone: "text-coral"
    },
    {
      label: "Eftir mánuðinn",
      value: money(data.savings, currency),
      href: `/monthly-overview?month=${month}`,
      dataKey: "savings",
      color: monthBalanceColor,
      icon: PiggyBank,
      tone: monthBalanceTone
    },
    {
      label: "Fjöldi færslna",
      value: data.transactions.length.toLocaleString("is-IS"),
      href: `/transactions?month=${month}`,
      dataKey: null,
      color: "rgb(var(--color-accent))",
      icon: ListChecks,
      tone: "text-accent"
    }
  ];

  return (
    <>
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl">Góðan daginn{displayName ? `, ${displayName}` : ""}!</h1>
          <p className="mt-1 text-sm text-ink/55">Hér er staðan fyrir {monthLabel(month)}.</p>
          <span className={`mt-3 inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${statusClass}`}>Fjárhagsstaða: {financialStatus}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/monthly-overview?month=${month}`}>
            <Button type="button" variant="secondary">Skoða mánuð</Button>
          </Link>
          <Link href="/transactions">
            <Button type="button">Ný færsla</Button>
          </Link>
        </div>
      </header>

      <section className="stagger-children grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Stutt yfirlit">
        {overviewStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href} className="group block h-full">
              <Card className="motion-card h-full min-h-[118px]">
                <div className="flex items-start justify-between gap-3">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${stat.tone}`}>
                    <Icon size={17} weight="duotone" />
                  </span>
                  <ArrowUpRight className="text-ink/20 transition group-hover:text-accent" size={16} />
                </div>
                <p className="mt-3 text-xs font-semibold text-ink/50">{stat.label}</p>
                <p className="mt-1 break-words text-lg font-bold leading-tight">{stat.value}</p>
                <p className="mt-1 text-xs text-ink/45">{stat.detail}</p>
              </Card>
            </Link>
          );
        })}
      </section>

      <section className="stagger-children mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Mánaðartölur">
        {monthlyStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href} className="group block h-full">
              <Card className="motion-card h-full min-h-[142px] overflow-hidden">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-ink/50">{stat.label}</p>
                  <Icon className={stat.tone} size={17} weight="duotone" />
                </div>
                <p className={`mt-2 text-xl font-bold ${stat.tone}`}>{stat.value}</p>
                {stat.dataKey ? (
                  <div className="mt-2">
                    <Sparkline data={data.trend} dataKey={stat.dataKey} color={stat.color} />
                  </div>
                ) : (
                  <div className="mt-5 flex items-center gap-2 text-xs font-medium text-ink/45">
                    <span className="h-px flex-1 bg-accent/35" />
                    <span>í þessum mánuði</span>
                  </div>
                )}
              </Card>
            </Link>
          );
        })}
      </section>

      <section className="mt-7 border-t border-line/10 pt-7">
        <MarketOverview data={marketData} compact detailsHref="/markets" />
      </section>

      <section className="mt-5 grid items-stretch gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(300px,0.9fr)]">
        <Card className="panel-enter h-full">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-bold">Tekjur vs. útgjöld</h2>
              <p className="mt-1 text-xs text-ink/50">Þróun síðustu sex mánaða.</p>
            </div>
            <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${positiveMonth ? "bg-lagoon/10 text-lagoon" : "bg-coral/10 text-coral"}`}>
              {percent(savingsRate)} sparnaðarhlutfall
            </span>
          </div>
          <TrendChart data={data.trend} height={270} />
        </Card>

        <Card className="panel-enter h-full">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-accent/10 text-accent">
              <PiggyBank size={19} weight="duotone" />
            </span>
            <div>
              <h2 className="font-bold">Fjárhagsleg staða</h2>
              <p className="text-xs text-ink/50">Byggt á gögnum mánaðarins.</p>
            </div>
          </div>

          <div className="my-6 flex items-center gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-[6px] border-accent/80">
              <span className={`text-sm font-bold ${positiveMonth ? "text-moss" : "text-coral"}`}>{positiveMonth ? "Góð" : "Athuga"}</span>
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold">{percent(savingsRate)}</p>
              <p className="text-xs text-ink/50">af tekjum eftir í mánuðinum</p>
            </div>
          </div>

          <div className="space-y-4">
            <MetricBar label="Sparnaðarhlutfall" value={(savingsRate / 20) * 100} detail={percent(savingsRate)} danger={savingsRate < 0} />
            <MetricBar label="Greiddir reikningar" value={billsProgress} detail={`${data.paidBills.length}/${data.activeBills.length}`} danger={billsProgress < 50} />
            <MetricBar label="Notkun útgjaldaáætlunar" value={budgetUsage} detail={data.budgeted > 0 ? percent(budgetUsage) : "Engin áætlun"} danger={budgetUsage > 100} />
            <MetricBar label="Sparnaðarmarkmið" value={goalProgress} detail={primaryGoal ? percent(goalProgress) : "Ekkert markmið"} />
          </div>
        </Card>
      </section>

      <section className="mt-5">
        <Card className="animate-rise">
          <div className="mb-4">
            <h2 className="font-bold">Útgjöld eftir flokkum</h2>
            <p className="mt-1 text-xs text-ink/50">Smelltu á flokk til að sjá færslurnar.</p>
          </div>
          {data.spendingByCategory.length ? (
            <PieBreakdown data={data.spendingByCategory} links={categoryHrefMap} />
          ) : (
            <EmptyState>Engin útgjöld í þessum mánuði.</EmptyState>
          )}
        </Card>
      </section>

      <section className="mt-5 grid items-stretch gap-4 lg:grid-cols-2">
        <Card className="animate-rise h-full">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-bold">Reikningar mánaðarins</h2>
            <Link className="text-sm font-semibold text-accent underline-offset-2 hover:underline" href={`/bills?month=${month}`}>Opna</Link>
          </div>
          {!data.billsReady ? (
            <EmptyState>Reikningataflan er ekki virk í Supabase enn.</EmptyState>
          ) : data.activeBills.length ? (
            <div>
              <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-md bg-muted/55 px-2 py-2">
                  <p className="text-ink/45">Greitt</p>
                  <p className="mt-1 font-bold text-moss">{money(data.paidBillsTotal, currency)}</p>
                </div>
                <div className="rounded-md bg-muted/55 px-2 py-2">
                  <p className="text-ink/45">Ógreitt</p>
                  <p className="mt-1 font-bold text-coral">{money(data.unpaidBillsTotal, currency)}</p>
                </div>
                <div className="rounded-md bg-muted/55 px-2 py-2">
                  <p className="text-ink/45">Staða</p>
                  <p className="mt-1 font-bold">{data.paidBills.length}/{data.activeBills.length}</p>
                </div>
              </div>
              <div className="divide-y divide-line/10">
                {data.activeBills.slice(0, 4).map((bill) => (
                  <Link key={bill.id} href={`/bills?month=${month}`} className="flex items-center justify-between gap-3 py-3 text-sm transition hover:text-accent">
                    <span className="flex min-w-0 items-center gap-2">
                      {bill.payment ? <CheckCircle2 className="shrink-0 text-moss" size={17} /> : <Circle className="shrink-0 text-ink/35" size={17} />}
                      <span className="truncate font-semibold">{bill.name}</span>
                    </span>
                    <span className={bill.payment ? "shrink-0 font-bold text-moss" : "shrink-0 font-bold text-coral"}>{money(Number(bill.payment?.amount ?? bill.amount), currency)}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState>Engir virkir reikningar skráðir.</EmptyState>
          )}
        </Card>

        <Card className="animate-rise h-full">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-bold">Sparnaðarmarkmið</h2>
            <Link className="text-sm font-semibold text-accent underline-offset-2 hover:underline" href="/savings-goals">Opna</Link>
          </div>
          {primaryGoal ? (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold">{primaryGoal.title}</span>
                <span className="font-bold text-lagoon">{percent(goalProgress)}</span>
              </div>
              <div className="mb-3 flex items-center justify-between gap-3 text-xs text-ink/50">
                <span>{money(data.totalSavingsBalance, currency)}</span>
                <span>{money(Number(primaryGoal.target_amount), currency)}</span>
              </div>
              <ProgressBar value={goalProgress} />
              <p className="mt-4 text-sm text-ink/55">{money(Math.max(0, Number(primaryGoal.target_amount) - data.totalSavingsBalance), currency)} eftir að markmiðinu.</p>
            </div>
          ) : (
            <EmptyState>Engin sparnaðarmarkmið enn.</EmptyState>
          )}
        </Card>
      </section>

      <section className="mt-5 grid items-stretch gap-4 lg:grid-cols-2">
        <Card className="animate-rise h-full">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Sparnaður</h2>
              <p className="mt-1 text-xs text-ink/50">Skipting heildarsparnaðar.</p>
            </div>
            <p className="text-xl font-bold text-lagoon">{money(data.totalSavingsBalance, currency)}</p>
          </div>
          {!data.savingsBucketsReady ? (
            <EmptyState>Keyrðu `supabase/savings-buckets-update.sql` í Supabase til að vista sparnaðarflokkana.</EmptyState>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {data.savingsBuckets.map((bucket) => (
                <Link key={bucket.bucket_type} href="/savings-goals" className="rounded-md bg-muted/50 p-3 transition hover:bg-muted">
                  <p className="text-xs font-semibold text-ink/50">{bucket.label}</p>
                  <p className="mt-1 font-bold">{money(Number(bucket.amount), currency)}</p>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="animate-rise h-full">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-bold">Nýlegar færslur</h2>
            <Link className="text-sm font-semibold text-accent underline-offset-2 hover:underline" href={`/transactions?month=${month}`}>Opna</Link>
          </div>
          {data.transactions.length ? (
            <div className="divide-y divide-line/10">
              {data.transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex justify-between gap-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{tx.note || "Færsla"}</p>
                    <p className="text-xs text-ink/45">{tx.categories?.name ?? "Óflokkað"}</p>
                  </div>
                  <p className={tx.type === "income" ? "shrink-0 font-bold text-moss" : "shrink-0 font-bold text-coral"}>
                    {tx.type === "income" ? "+" : "-"}{money(Number(tx.amount), currency)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>Engar færslur í þessum mánuði.</EmptyState>
          )}
        </Card>
      </section>
    </>
  );
}
