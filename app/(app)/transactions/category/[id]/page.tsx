import Link from "next/link";
import { ArrowLeftIcon as ArrowLeft } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { CalendarDotsIcon as CalendarDays } from "@phosphor-icons/react/dist/ssr/CalendarDots";
import { ReceiptIcon as ReceiptText } from "@phosphor-icons/react/dist/ssr/Receipt";
import { Card, EmptyState, MetricCard, PageHeader, SectionHeader } from "@/components/ui";
import { getCategoryById, getTransactions } from "@/lib/data";
import { currentMonth, money } from "@/lib/format";

function monthLabel(month: string) {
  const date = new Date(`${month}-01T00:00:00`);
  return new Intl.DateTimeFormat("is-IS", { month: "long", year: "numeric" }).format(date);
}

export default async function CategoryTransactionsPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const month = query.month ?? currentMonth();
  const type = query.type ?? "expense";
  const [category, transactions] = await Promise.all([
    getCategoryById(id),
    getTransactions({
      month,
      type,
      category: id,
      search: query.search,
      from: query.from,
      to: query.to
    })
  ]);

  const title = category?.name ?? "Óþekktur flokkur";
  const total = transactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  return (
    <>
      <div className="mb-4">
        <Link
          href={`/transactions?month=${month}&type=${type}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-accent underline-offset-2 hover:underline"
        >
          <ArrowLeft size={16} />
          Til baka í færslur
        </Link>
      </div>

      <PageHeader title={title} description={`Færslur í flokknum fyrir ${monthLabel(month)}.`} />

      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <MetricCard label="Tímabil" value={monthLabel(month)} detail={`${transactions.length} færslur`} icon={<CalendarDays size={19} weight="duotone" />} tone="accent" />
        <MetricCard label="Samtals í flokki" value={money(total, "ISK")} detail={type === "income" ? "Tekjur" : "Útgjöld"} icon={<ReceiptText size={19} weight="duotone" />} tone={type === "income" ? "moss" : "coral"} />
      </div>

      <Card>
        <SectionHeader title="Færslur í flokki" description="Nákvæm sundurliðun valins tímabils." />
        {transactions.length ? (
          <>
            <div className="grid gap-2 sm:hidden">
              {transactions.map((transaction) => (
                <article key={transaction.id} className="rounded-md border border-line/10 bg-muted/25 p-3">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{transaction.note || "Færsla"}</p>
                      <p className="mt-0.5 text-xs text-ink/50">{transaction.date} · {transaction.type === "income" ? "Tekjur" : "Útgjöld"}</p>
                    </div>
                    <p className={transaction.type === "income" ? "shrink-0 font-bold text-moss" : "shrink-0 font-bold text-coral"}>
                      {transaction.type === "income" ? "+" : "-"}{money(Number(transaction.amount), "ISK")}
                    </p>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-ink/55">
              <tr>
                <th className="pb-3">Dagsetning</th>
                <th className="pb-3">Lýsing</th>
                <th className="pb-3">Tegund</th>
                <th className="pb-3 text-right">Upphæð</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/10">
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="py-3">{transaction.date}</td>
                  <td className="py-3 font-semibold">{transaction.note || "Færsla"}</td>
                  <td className="py-3">{transaction.type === "income" ? "Tekjur" : "Útgjöld"}</td>
                  <td className="py-3 text-right font-bold">{money(Number(transaction.amount), "ISK")}</td>
                </tr>
              ))}
            </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyState>Engar færslur fundust í þessum flokki fyrir valið tímabil.</EmptyState>
        )}
      </Card>
    </>
  );
}
