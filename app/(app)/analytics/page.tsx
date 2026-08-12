import { CategoryBars, PieBreakdown, TrendChart } from "@/components/charts";
import { Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
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
      <PageHeader title="Greining" description="Berðu saman tekjur, útgjöld og sparnað og finndu mynstrin í fjármálunum þínum." />
      <div className="grid gap-5">
        <Card>
          <SectionHeader title="Tekjur á móti útgjöldum" description="Þróun síðustu átta mánaða." />
          <TrendChart data={trend} />
        </Card>
        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <SectionHeader title="Skipting útgjalda" description="Stærstu útgjaldaflokkarnir á tímabilinu." />
            {spending.length ? <CategoryBars data={spending.slice(0, 8)} /> : <EmptyState>Engin útgjaldagögn.</EmptyState>}
          </Card>
          <Card>
            <SectionHeader title="Yfirlit tekna" description="Hlutfallsleg skipting tekna eftir flokkum." />
            {income.length ? <PieBreakdown data={income} centerLabel="Heildartekjur" /> : <EmptyState>Engin tekjugögn.</EmptyState>}
          </Card>
        </div>
        <Card>
          <SectionHeader title="Þróun sparnaðar" description="Sparnaðarframlög flokkuð eftir mánuðum." />
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
