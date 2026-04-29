import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { CsvImporter } from "@/components/csv-importer";
import { Button, Card, EmptyState, Field, PageHeader, inputClass } from "@/components/ui";
import { deleteAllTransactions, deleteTransaction, saveTransaction } from "@/lib/actions";
import { getCategories, getTransactions } from "@/lib/data";
import { currentMonth, isoDate, money } from "@/lib/format";

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const month = params.month ?? currentMonth();
  const [categories, transactions] = await Promise.all([
    getCategories(),
    getTransactions({
      month,
      type: params.type,
      category: params.category,
      search: params.search,
      from: params.from,
      to: params.to
    })
  ]);
  const currency = "ISK";
  const selectableCategories = categories.filter((category) =>
    params.type === "income" ? category.type !== "expense" : params.type === "expense" ? category.type !== "income" : true
  );

  return (
    <>
      <PageHeader
        title="Færslur"
        action={
          transactions.length ? (
            <form action={deleteAllTransactions}>
              <Button variant="danger">
                <Trash2 size={16} />
                Eyða öllum færslum
              </Button>
            </form>
          ) : null
        }
      />

      <Card className="mb-5">
        <form action={saveTransaction} className="grid gap-3 md:grid-cols-[1fr_130px_140px_140px_1fr_auto]">
          <input className={inputClass} name="note" placeholder="Lýsing" required />
          <input className={inputClass} name="amount" type="number" step="0.01" min="0.01" placeholder="Upphæð" required />
          <select className={inputClass} name="type" required>
            <option value="expense">Útgjöld</option>
            <option value="income">Tekjur</option>
          </select>
          <input className={inputClass} name="date" type="date" defaultValue={isoDate()} required />
          <select className={inputClass} name="category_id">
            <option value="">Óflokkað</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <Button type="submit">
            <Plus size={17} />
            Bæta við
          </Button>
        </form>
      </Card>

      <Card className="mb-5">
        <form className="grid gap-3 md:grid-cols-6">
          <Field label="Mánuður">
            <input className={inputClass} name="month" type="month" defaultValue={month} />
          </Field>
          <Field label="Frá">
            <input className={inputClass} name="from" type="date" defaultValue={params.from} />
          </Field>
          <Field label="Til">
            <input className={inputClass} name="to" type="date" defaultValue={params.to} />
          </Field>
          <Field label="Tegund">
            <select className={inputClass} name="type" defaultValue={params.type ?? ""}>
              <option value="">Allt</option>
              <option value="income">Tekjur</option>
              <option value="expense">Útgjöld</option>
            </select>
          </Field>
          <Field label="Flokkur">
            <select className={inputClass} name="category" defaultValue={params.category ?? ""}>
              <option value="">Allir flokkar</option>
              {selectableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Leit">
            <input className={inputClass} name="search" defaultValue={params.search} placeholder="Lýsing" />
          </Field>
          <div className="md:col-span-6">
            <Button type="submit" variant="secondary">
              Sía færslur
            </Button>
          </div>
        </form>
      </Card>

      <div className="mb-5">
        <CsvImporter categories={categories} />
      </div>

      <Card className="overflow-x-auto">
        {transactions.length ? (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-ink/55">
              <tr>
                <th className="pb-3">Dagsetning</th>
                <th className="pb-3">Lýsing</th>
                <th className="pb-3">Flokkur</th>
                <th className="pb-3">Tegund</th>
                <th className="pb-3 text-right">Upphæð</th>
                <th className="pb-3 text-right">Aðgerðir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/10">
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="py-3">{tx.date}</td>
                  <td className="py-3 font-semibold">
                    <details>
                      <summary>{tx.note || "Færsla"}</summary>
                      <form action={saveTransaction} className="mt-3 grid gap-2">
                        <input type="hidden" name="id" value={tx.id} />
                        <input className={inputClass} name="note" defaultValue={tx.note ?? ""} required />
                        <input className={inputClass} name="amount" type="number" step="0.01" min="0.01" defaultValue={Number(tx.amount)} required />
                        <input className={inputClass} name="date" type="date" defaultValue={tx.date} required />
                        <select className={inputClass} name="type" defaultValue={tx.type}>
                          <option value="expense">Útgjöld</option>
                          <option value="income">Tekjur</option>
                        </select>
                        <select className={inputClass} name="category_id" defaultValue={tx.category_id ?? ""}>
                          <option value="">Óflokkað</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                        <Button type="submit" variant="secondary">
                          Vista breytingar
                        </Button>
                      </form>
                    </details>
                  </td>
                  <td className="py-3">
                    {tx.category_id ? (
                      <Link className="font-semibold text-moss underline-offset-2 hover:underline" href={`/transactions/category/${tx.category_id}?month=${month}&type=${tx.type}`}>
                        {tx.categories?.name ?? "Óflokkað"}
                      </Link>
                    ) : (
                      tx.categories?.name ?? "Óflokkað"
                    )}
                  </td>
                  <td className="py-3">{tx.type === "income" ? "Tekjur" : "Útgjöld"}</td>
                  <td className="py-3 text-right font-bold">{money(Number(tx.amount), currency)}</td>
                  <td className="py-3 text-right">
                    <form action={deleteTransaction}>
                      <input type="hidden" name="id" value={tx.id} />
                      <Button variant="danger" className="h-9 w-9 p-0" title="Eyða">
                        <Trash2 size={16} />
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState>Engar færslur fundust.</EmptyState>
        )}
      </Card>
    </>
  );
}
