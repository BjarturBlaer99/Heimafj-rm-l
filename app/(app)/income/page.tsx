import { PlusIcon as Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { TrashIcon as Trash2 } from "@phosphor-icons/react/dist/ssr/Trash";
import { TrendUpIcon as TrendingUp } from "@phosphor-icons/react/dist/ssr/TrendUp";
import { Button, Card, EmptyState, MetricCard, PageHeader, SectionHeader, inputClass } from "@/components/ui";
import { deleteMonthlyIncome, saveMonthlyIncome } from "@/lib/actions";
import { getCategories, getTransactions } from "@/lib/data";
import { currentMonth, money } from "@/lib/format";

function monthLabel(monthStart: string) {
  const date = new Date(`${monthStart}T00:00:00`);
  return new Intl.DateTimeFormat("is-IS", { month: "long", year: "numeric" }).format(date);
}

export default async function IncomePage() {
  const [categories, incomes] = await Promise.all([getCategories(), getTransactions({ type: "income" })]);
  const incomeCategories = categories.filter((category) => category.type === "income" || category.type === "both");
  const currency = "ISK";

  const monthlyRows = Object.values(
    incomes.reduce<Record<string, { month: string; total: number; count: number }>>((acc, income) => {
      const month = income.date.slice(0, 7);
      if (!acc[month]) acc[month] = { month, total: 0, count: 0 };
      acc[month].total += Number(income.amount);
      acc[month].count += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.month.localeCompare(a.month));

  const currentMonthIncome = monthlyRows.find((row) => row.month === currentMonth())?.total ?? 0;
  const totalIncome = incomes.reduce((sum, income) => sum + Number(income.amount), 0);

  return (
    <>
      <PageHeader title="Tekjur" description="Skráðu tekjur og fylgstu með þróun þeirra milli mánaða." />

      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <MetricCard label="Tekjur í þessum mánuði" value={money(currentMonthIncome, currency)} detail={monthLabel(`${currentMonth()}-01`)} icon={<TrendingUp size={19} weight="duotone" />} tone="moss" />
        <MetricCard label="Heildartekjur skráðar" value={money(totalIncome, currency)} detail={`${incomes.length} tekjufærslur samtals`} icon={<TrendingUp size={19} weight="duotone" />} tone="moss" />
      </div>

      <Card className="mb-5">
        <SectionHeader title="Skrá tekjur" description="Bættu við einni tekjufærslu fyrir valinn mánuð." />
        <form action={saveMonthlyIncome} className="grid gap-3 md:grid-cols-[140px_140px_1fr_auto]">
          <input className={inputClass} name="month" type="month" defaultValue={currentMonth()} required />
          <input className={inputClass} name="amount" type="number" step="0.01" min="0.01" placeholder="Upphæð" required />
          <div className="grid gap-3 md:grid-cols-[180px_1fr]">
            <select className={inputClass} name="category_id">
              <option value="">Velja flokk</option>
              {incomeCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <input className={inputClass} name="note" placeholder="Lýsing, t.d. laun apríl" />
          </div>
          <Button type="submit">
            <Plus size={17} />
            Skrá tekjur
          </Button>
        </form>
      </Card>

      <div className="mb-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <SectionHeader title="Tekjur eftir mánuðum" description="Samantekt skráðra tekna eftir tímabilum." />
          {monthlyRows.length ? (
            <>
              <div className="divide-y divide-line/10 sm:hidden">
                {monthlyRows.map((row) => (
                  <div key={row.month} className="flex min-w-0 items-center justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold capitalize">{monthLabel(`${row.month}-01`)}</p>
                      <p className="mt-0.5 text-xs text-ink/50">{row.count} færslur</p>
                    </div>
                    <p className="shrink-0 font-bold text-moss">{money(row.total, currency)}</p>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="text-ink/55">
                <tr>
                  <th className="pb-3">Mánuður</th>
                  <th className="pb-3">Fjöldi færslna</th>
                  <th className="pb-3 text-right">Samtals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/10">
                {monthlyRows.map((row) => (
                  <tr key={row.month}>
                    <td className="py-3 font-semibold">{monthLabel(`${row.month}-01`)}</td>
                    <td className="py-3">{row.count}</td>
                    <td className="py-3 text-right font-bold">{money(row.total, currency)}</td>
                  </tr>
                ))}
              </tbody>
                </table>
              </div>
            </>
          ) : (
            <EmptyState>Engar tekjur hafa verið skráðar enn.</EmptyState>
          )}
        </Card>

        <Card>
          <SectionHeader title="Skráðar tekjufærslur" description="Nákvæm sundurliðun allra tekjufærslna." />
          {incomes.length ? (
            <>
              <div className="grid gap-2 sm:hidden">
                {incomes.map((income) => (
                  <article key={income.id} className="rounded-md border border-line/10 bg-muted/25 p-3">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{income.note || "Tekjufærsla"}</p>
                        <p className="mt-0.5 text-xs text-ink/50 capitalize">{monthLabel(income.date)} · {income.categories?.name ?? "Óflokkað"}</p>
                      </div>
                      <p className="shrink-0 font-bold text-moss">{money(Number(income.amount), currency)}</p>
                    </div>
                    <form action={deleteMonthlyIncome} className="mt-3 flex justify-end border-t border-line/8 pt-3">
                      <input type="hidden" name="id" value={income.id} />
                      <Button variant="danger" className="h-9 w-9 p-0" title="Eyða">
                        <Trash2 size={16} />
                      </Button>
                    </form>
                  </article>
                ))}
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-ink/55">
                <tr>
                  <th className="pb-3">Mánuður</th>
                  <th className="pb-3">Lýsing</th>
                  <th className="pb-3">Flokkur</th>
                  <th className="pb-3 text-right">Upphæð</th>
                  <th className="pb-3 text-right">Aðgerðir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/10">
                {incomes.map((income) => (
                  <tr key={income.id}>
                    <td className="py-3">{monthLabel(income.date)}</td>
                    <td className="py-3 font-semibold">{income.note || "Tekjufærsla"}</td>
                    <td className="py-3">{income.categories?.name ?? "Óflokkað"}</td>
                    <td className="py-3 text-right font-bold text-moss">{money(Number(income.amount), currency)}</td>
                    <td className="py-3 text-right">
                      <form action={deleteMonthlyIncome}>
                        <input type="hidden" name="id" value={income.id} />
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
            <EmptyState>Skráðu fyrstu mánaðartekjurnar hér að ofan.</EmptyState>
          )}
        </Card>
      </div>
    </>
  );
}
