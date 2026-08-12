import { CardsIcon as WalletCards } from "@phosphor-icons/react/dist/ssr/Cards";
import { PlusIcon as Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { TrashIcon as Trash2 } from "@phosphor-icons/react/dist/ssr/Trash";
import { TrendDownIcon as TrendingDown } from "@phosphor-icons/react/dist/ssr/TrendDown";
import Link from "next/link";
import { CategoryBars } from "@/components/charts";
import { Button, Card, EmptyState, MetricCard, PageHeader, ProgressBar, SectionHeader, inputClass } from "@/components/ui";
import { deleteBudget, saveBudget } from "@/lib/actions";
import { getAllBudgets, getBudgets, getCategories, getTransactions } from "@/lib/data";
import { currentMonth, money } from "@/lib/format";

function monthLabel(month: string) {
  const date = new Date(`${month}-01T00:00:00`);
  return new Intl.DateTimeFormat("is-IS", { month: "long", year: "numeric" }).format(date);
}

export default async function ExpensesPage() {
  const month = currentMonth();
  const [categories, currentBudgets, allBudgets, transactions] = await Promise.all([
    getCategories(),
    getBudgets(month),
    getAllBudgets(),
    getTransactions({ type: "expense" })
  ]);
  const currency = "ISK";
  const currentExpenseTransactions = transactions.filter((tx) => tx.date.startsWith(month));
  const expenseTotal = currentExpenseTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const categoryTotals = Object.values(
    currentExpenseTransactions.reduce<Record<string, { id: string | null; name: string; value: number }>>((acc, tx) => {
      const key = tx.category_id ?? "unclassified";
      if (!acc[key]) {
        acc[key] = {
          id: tx.category_id,
          name: tx.categories?.name ?? "Óflokkað",
          value: 0
        };
      }
      acc[key].value += Number(tx.amount);
      return acc;
    }, {})
  ).sort((a, b) => b.value - a.value);
  const topExpense = categoryTotals[0] ?? null;

  const currentOverallBudget = currentBudgets.find((budget) => budget.category_id === null) ?? null;
  const currentMonthlyBudget = currentOverallBudget ? Number(currentOverallBudget.amount) : 0;
  const currentBudgetProgress = currentMonthlyBudget > 0 ? (expenseTotal / currentMonthlyBudget) * 100 : 0;

  const monthlyOverview = Object.values(
    [...allBudgets.filter((budget) => budget.category_id === null), ...transactions].reduce<
      Record<string, { month: string; budgetAmount: number; spentAmount: number }>
    >((acc, item) => {
      const monthKey = "month" in item ? item.month.slice(0, 7) : item.date.slice(0, 7);
      if (!acc[monthKey]) acc[monthKey] = { month: monthKey, budgetAmount: 0, spentAmount: 0 };

      if ("month" in item) acc[monthKey].budgetAmount += Number(item.amount);
      else acc[monthKey].spentAmount += Number(item.amount);

      return acc;
    }, {})
  )
    .filter((row) => row.month !== month)
    .sort((a, b) => b.month.localeCompare(a.month));

  return (
    <>
      <PageHeader title="Útgjöld" description="Greindu útgjöld, settu mánaðaráætlun og fylgstu með stöðunni í rauntíma." />

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <MetricCard label="Útgjöld í mánuðinum" value={money(expenseTotal, currency)} detail={monthLabel(month)} icon={<TrendingDown size={19} weight="duotone" />} tone="coral" />
        <MetricCard label="Stærsti útgjaldaflokkur" value={topExpense?.name ?? "Enginn flokkur"} detail={topExpense ? money(topExpense.value, currency) : "0 kr."} icon={<WalletCards size={19} weight="duotone" />} tone="gold" href={topExpense?.id ? `/transactions/category/${topExpense.id}?month=${month}&type=expense` : undefined} />
        <MetricCard label="Mánaðaráætlun" value={money(currentMonthlyBudget, currency)} detail={`Heildaráætlun fyrir ${monthLabel(month)}`} icon={<WalletCards size={19} weight="duotone" />} tone="accent" />
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <SectionHeader title="Útgjöld eftir flokkum" description="Flokkar raðaðir eftir heildarupphæð í mánuðinum." />
          {categoryTotals.length ? (
            <div className="space-y-4">
              <CategoryBars data={categoryTotals.slice(0, 8).map((item) => ({ name: item.name, value: item.value }))} />
              <div className="grid gap-2">
                {categoryTotals.map((item) =>
                  item.id ? (
                    <Link
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-line/10 bg-surface/70 px-3 py-2 text-sm font-semibold text-accent transition hover:bg-muted"
                      href={`/transactions/category/${item.id}?month=${month}&type=expense`}
                    >
                      <span className="min-w-0 truncate">{item.name}</span>
                      <span className="shrink-0">{money(item.value, currency)}</span>
                    </Link>
                  ) : (
                    <div key={item.name} className="flex items-center justify-between rounded-lg border border-line/10 bg-surface/60 px-3 py-2 text-sm text-ink/60">
                      <span className="min-w-0 truncate">{item.name}</span>
                      <span className="shrink-0">{money(item.value, currency)}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          ) : (
            <EmptyState>Engin útgjöld skráð í þessum mánuði.</EmptyState>
          )}
        </Card>
        <Card>
          <SectionHeader title="Mánaðarstaða" description="Samanburður útgjalda við heildaráætlun mánaðarins." />
          {currentMonthlyBudget > 0 ? (
            <div>
              <div className="mb-2 grid grid-cols-2 gap-2 text-sm">
                <span>{money(expenseTotal, currency)} notað</span>
                <span className="text-right">{money(currentMonthlyBudget, currency)} áætlað</span>
              </div>
              <ProgressBar value={currentBudgetProgress} />
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-ink/55">
                <span>{money(Math.max(0, currentMonthlyBudget - expenseTotal), currency)} eftir</span>
                {currentBudgetProgress > 100 ? <span className="text-right font-semibold text-coral">Yfir áætlun</span> : <span className="text-right">Innan áætlunar</span>}
              </div>
            </div>
          ) : (
            <EmptyState>Engin heildaráætlun hefur verið skráð fyrir þennan mánuð enn.</EmptyState>
          )}
        </Card>
      </div>

      <Card className="mb-5">
        <SectionHeader title="Útgjaldaáætlun" description="Settu heildaráætlun eða áætlun fyrir einstaka útgjaldaflokka." />
        <form action={saveBudget} className="grid gap-3 md:grid-cols-[1fr_150px_150px_auto]">
          <select className={inputClass} name="category_id">
            <option value="">Heildaráætlun</option>
            {categories
              .filter((c) => c.type !== "income")
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </select>
          <input className={inputClass} name="month" type="month" defaultValue={month} required />
          <input className={inputClass} name="amount" type="number" min="0.01" step="0.01" placeholder="Upphæð" required />
          <Button type="submit">
            <Plus size={17} />
            Bæta við
          </Button>
        </form>
      </Card>

      <Card className="mb-5">
        <SectionHeader title="Mánaðaryfirlit" description="Samanburður áætlunar og raunútgjalda fyrri mánaða." />
        {monthlyOverview.length ? (
          <>
            <div className="grid gap-2 md:hidden">
              {monthlyOverview.map((row) => {
                const difference = row.budgetAmount - row.spentAmount;
                const usage = row.budgetAmount > 0 ? (row.spentAmount / row.budgetAmount) * 100 : 0;
                return (
                  <article key={row.month} className="rounded-md border border-line/10 bg-muted/25 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold capitalize">{monthLabel(row.month)}</p>
                        <p className={difference < 0 ? "mt-0.5 text-xs font-semibold text-coral" : "mt-0.5 text-xs font-semibold text-moss"}>
                          {difference < 0 ? "Yfir áætlun" : "Innan áætlunar"}
                        </p>
                      </div>
                      <p className={difference < 0 ? "shrink-0 font-bold text-coral" : "shrink-0 font-bold text-moss"}>{money(difference, currency)}</p>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-line/8 pt-3 text-xs">
                      <span className="text-ink/50">Áætlun</span>
                      <span className="text-right font-semibold">{money(row.budgetAmount, currency)}</span>
                      <span className="text-ink/50">Útgjöld</span>
                      <span className="text-right font-semibold">{money(row.spentAmount, currency)}</span>
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-xs text-ink/50">
                        <span>Nýting</span>
                        <span>{Math.round(usage)}%</span>
                      </div>
                      <ProgressBar value={usage} />
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-ink/55">
              <tr>
                <th className="pb-3">Mánuður</th>
                <th className="pb-3 text-right">Heildaráætlun</th>
                <th className="pb-3 text-right">Útgjöld</th>
                <th className="pb-3 text-right">Niðurstaða</th>
                <th className="pb-3 text-right">Trend</th>
                <th className="pb-3 text-right">Staða</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/10">
              {monthlyOverview.map((row) => {
                const difference = row.budgetAmount - row.spentAmount;
                const usage = row.budgetAmount > 0 ? (row.spentAmount / row.budgetAmount) * 100 : 0;
                const clampedUsage = Math.max(0, Math.min(usage, 100));
                return (
                  <tr key={row.month}>
                    <td className="py-3 font-semibold">{monthLabel(row.month)}</td>
                    <td className="py-3 text-right">{money(row.budgetAmount, currency)}</td>
                    <td className="py-3 text-right">{money(row.spentAmount, currency)}</td>
                    <td className={`py-3 text-right font-bold ${difference < 0 ? "text-coral" : "text-moss"}`}>{money(difference, currency)}</td>
                    <td className="py-3">
                      <div className="ml-auto w-40">
                        <div className="mb-1 flex justify-between text-xs text-ink/55">
                          <span>{Math.round(usage)}%</span>
                          <span>{difference < 0 ? "yfir" : "innan"}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-line/10">
                          <div className={`h-full rounded-full ${usage > 100 ? "bg-coral" : "bg-moss"}`} style={{ width: `${clampedUsage}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <span className={difference < 0 ? "font-semibold text-coral" : "font-semibold text-moss"}>
                        {difference < 0 ? "Yfir áætlun" : "Innan áætlunar"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyState>Engir lokaðir mánuðir með útgjaldayfirliti enn.</EmptyState>
        )}
      </Card>

      <section>
        <SectionHeader title="Áætlanir þessa mánaðar" description="Breyttu eða fjarlægðu virkar áætlanir eftir þörfum." />
        <div className="grid gap-4 lg:grid-cols-2">
        {currentBudgets.length ? (
          currentBudgets.map((budget) => {
            const spent = budget.category_id
              ? currentExpenseTransactions.filter((tx) => tx.category_id === budget.category_id).reduce((sum, tx) => sum + Number(tx.amount), 0)
              : expenseTotal;
            const usage = (spent / Number(budget.amount)) * 100;

            return (
              <Card key={budget.id}>
                <div className="flex justify-between gap-3">
                  <div>
                    <h2 className="font-bold">{budget.categories?.name ?? "Heildaráætlun"}</h2>
                    <p className="text-sm text-ink/55">{budget.month.slice(0, 7)}</p>
                  </div>
                  <form action={deleteBudget}>
                    <input type="hidden" name="id" value={budget.id} />
                    <Button variant="danger" className="h-9 w-9 p-0">
                      <Trash2 size={16} />
                    </Button>
                  </form>
                </div>
                <div className="mt-5">
                  <div className="mb-2 grid grid-cols-2 gap-2 text-sm">
                    <span>{money(spent, currency)} notað</span>
                    <span className="text-right">{money(Number(budget.amount), currency)} áætlað</span>
                  </div>
                  <ProgressBar value={usage} />
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-ink/55">
                    <span>{money(Math.max(0, Number(budget.amount) - spent), currency)} eftir</span>
                    {usage > 100 ? <span className="text-right font-semibold text-coral">Yfir áætlun</span> : <span className="text-right">Innan áætlunar</span>}
                  </div>
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-semibold text-accent">Breyta áætlun</summary>
                  <form action={saveBudget} className="mt-3 grid gap-2">
                    <input type="hidden" name="id" value={budget.id} />
                    <select className={inputClass} name="category_id" defaultValue={budget.category_id ?? ""}>
                      <option value="">Heildaráætlun</option>
                      {categories
                        .filter((c) => c.type !== "income")
                        .map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                    </select>
                    <input className={inputClass} name="month" type="month" defaultValue={budget.month.slice(0, 7)} required />
                    <input className={inputClass} name="amount" type="number" min="0.01" step="0.01" defaultValue={Number(budget.amount)} required />
                    <Button type="submit" variant="secondary">
                      Vista breytingar
                    </Button>
                  </form>
                </details>
              </Card>
            );
          })
        ) : (
          <EmptyState>Engar útgjaldaáætlanir skráðar fyrir þennan mánuð.</EmptyState>
        )}
        </div>
      </section>
    </>
  );
}
