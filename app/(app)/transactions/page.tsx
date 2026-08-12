import { PlusIcon as Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { TrashIcon as Trash2 } from "@phosphor-icons/react/dist/ssr/Trash";
import Link from "next/link";
import { ConfirmButton } from "@/components/confirm-button";
import { CsvImporter } from "@/components/csv-importer";
import { FlashMessage } from "@/components/flash-message";
import { Button, Card, EmptyState, Field, PageHeader, SectionHeader, inputClass } from "@/components/ui";
import { deleteAllTransactions, deleteTransaction, saveTransaction } from "@/lib/actions";
import { getCategories, getTransactions } from "@/lib/data";
import { currentMonth, isoDate, money } from "@/lib/format";

type Transaction = Awaited<ReturnType<typeof getTransactions>>[number];
type Category = Awaited<ReturnType<typeof getCategories>>[number];

function TransactionEditor({ transaction, categories, summary }: { transaction: Transaction; categories: Category[]; summary: string }) {
  return (
    <details>
      <summary className="cursor-pointer">{summary}</summary>
      <form action={saveTransaction} className="mt-3 grid gap-2">
        <input type="hidden" name="id" value={transaction.id} />
        <input className={inputClass} name="note" defaultValue={transaction.note ?? ""} required />
        <input className={inputClass} name="amount" type="number" step="0.01" min="0.01" defaultValue={Number(transaction.amount)} required />
        <input className={inputClass} name="date" type="date" defaultValue={transaction.date} required />
        <select className={inputClass} name="type" defaultValue={transaction.type}>
          <option value="expense">Útgjöld</option>
          <option value="income">Tekjur</option>
        </select>
        <select className={inputClass} name="category_id" defaultValue={transaction.category_id ?? ""}>
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
  );
}

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
        description="Skráðu, flokkaðu og leitaðu í öllum tekju- og útgjaldafærslum á einum stað."
        action={
          transactions.length ? (
            <form action={deleteAllTransactions}>
              <ConfirmButton variant="danger" confirmMessage="Ertu viss um að þú viljir eyða öllum færslum? Þetta er ekki hægt að afturkalla.">
                <Trash2 size={16} />
                Eyða öllum færslum
              </ConfirmButton>
            </form>
          ) : null
        }
      />
      <FlashMessage code={params.success} imported={params.imported} skipped={params.skipped} />

      <Card className="mb-5">
        <SectionHeader title="Ný færsla" description="Bættu handvirkt við tekju- eða útgjaldafærslu." />
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
        <SectionHeader title="Sía færslur" description="Þrengdu niðurstöður eftir tímabili, tegund, flokki eða leitarorði." />
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
            <Button type="submit" variant="secondary" className="w-full sm:w-auto">
              Sía færslur
            </Button>
          </div>
        </form>
      </Card>

      <div className="mb-5">
        <CsvImporter categories={categories} />
      </div>

      <Card>
        <SectionHeader title="Skráðar færslur" description={`${transactions.length} færslur fundust fyrir valdar síur.`} />
        {transactions.length ? (
          <>
            <div className="grid gap-2 sm:hidden">
              {transactions.map((tx) => (
                <article key={tx.id} className="min-w-0 rounded-md border border-line/10 bg-muted/25 p-3">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{tx.note || "Færsla"}</p>
                      <p className="mt-0.5 text-xs text-ink/50">{tx.date}</p>
                    </div>
                    <p className={tx.type === "income" ? "shrink-0 font-bold text-moss" : "shrink-0 font-bold text-coral"}>
                      {tx.type === "income" ? "+" : "-"}{money(Number(tx.amount), currency)}
                    </p>
                  </div>
                  <div className="mt-3 flex min-w-0 items-center justify-between gap-3 border-t border-line/8 pt-3 text-xs">
                    {tx.category_id ? (
                      <Link className="min-w-0 truncate font-semibold text-accent" href={`/transactions/category/${tx.category_id}?month=${month}&type=${tx.type}`}>
                        {tx.categories?.name ?? "Óflokkað"}
                      </Link>
                    ) : (
                      <span className="min-w-0 truncate text-ink/50">{tx.categories?.name ?? "Óflokkað"}</span>
                    )}
                    <span className="shrink-0 rounded-md bg-surface px-2 py-1 font-semibold text-ink/55">{tx.type === "income" ? "Tekjur" : "Útgjöld"}</span>
                  </div>
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 text-sm font-semibold text-accent">
                      <TransactionEditor transaction={tx} categories={categories} summary="Breyta færslu" />
                    </div>
                    <form action={deleteTransaction}>
                      <input type="hidden" name="id" value={tx.id} />
                      <Button variant="danger" className="h-9 w-9 p-0" title="Eyða">
                        <Trash2 size={16} />
                      </Button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto sm:block">
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
                    <TransactionEditor transaction={tx} categories={categories} summary={tx.note || "Færsla"} />
                  </td>
                  <td className="py-3">
                    {tx.category_id ? (
                      <Link className="font-semibold text-accent underline-offset-2 hover:underline" href={`/transactions/category/${tx.category_id}?month=${month}&type=${tx.type}`}>
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
            </div>
          </>
        ) : (
          <EmptyState>Engar færslur fundust. Bættu við færslu handvirkt eða flyttu inn CSV/Excel skrá hér að ofan.</EmptyState>
        )}
      </Card>
    </>
  );
}
