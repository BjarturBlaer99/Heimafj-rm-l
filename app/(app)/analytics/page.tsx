import { CategoryBars, PieBreakdown, TrendChart } from "@/components/charts";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { categoryTotals, getSavingsContributions, getTransactions, monthlyTrend } from "@/lib/data";

export default async function AnalyticsPage() {
  const [transactions, trend, contributions] = await Promise.all([getTransactions(), monthlyTrend(8), getSavingsContributions()]);
  const spending = categoryTotals(transactions.filter((tx) => tx.type === "expense"));
  const income = categoryTotals(transactions.filter((tx) => tx.type === "income"));
  const savingsTrend = contributions.reduce<Record<string, number>>((acc, item) => {
    const key = item.date.slice(0, 7);
    acc[key] = (acc[key] ?? 0) + Number(item.amount);
    return acc;
  }, {});

  return (
    <>
      <PageHeader title="Greining" />
      <div className="grid gap-5">
        <Card>
          <h2 className="mb-4 font-bold">Tekjur á móti útgjöldum</h2>
          <TrendChart data={trend} />
        </Card>
        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <h2 className="mb-4 font-bold">Skipting útgjalda</h2>
            {spending.length ? <CategoryBars data={spending.slice(0, 8)} /> : <EmptyState>Engin útgjaldagögn.</EmptyState>}
          </Card>
          <Card>
            <h2 className="mb-4 font-bold">Yfirlit tekna</h2>
            {income.length ? <PieBreakdown data={income} /> : <EmptyState>Engin tekjugögn.</EmptyState>}
          </Card>
        </div>
        <Card>
          <h2 className="mb-4 font-bold">Þróun sparnaðar</h2>
          {Object.keys(savingsTrend).length ? (
            <CategoryBars data={Object.entries(savingsTrend).map(([name, value]) => ({ name, value }))} />
          ) : (
            <EmptyState>Engin sparnaðarframlög enn.</EmptyState>
          )}
        </Card>
      </div>
    </>
  );
}
