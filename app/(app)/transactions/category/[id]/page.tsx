import Link from "next/link";
import { ArrowLeftIcon as ArrowLeft } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { getCategoryById, getTransactions } from "@/lib/data";
import { currentMonth, money } from "@/lib/format";

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

      <PageHeader title={title} />

      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <Card>
          <p className="text-sm font-semibold text-ink/55">Tímabil</p>
          <p className="mt-2 text-xl font-bold">{month}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-ink/55">Samtals í flokki</p>
          <p className="mt-2 text-xl font-bold">{money(total, "ISK")}</p>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        {transactions.length ? (
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
        ) : (
          <EmptyState>Engar færslur fundust í þessum flokki fyrir valið tímabil.</EmptyState>
        )}
      </Card>
    </>
  );
}
