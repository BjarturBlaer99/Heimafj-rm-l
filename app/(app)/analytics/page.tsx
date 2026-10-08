import { CategoryBars, PieBreakdown, TrendChart } from "@/components/charts";
import { Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { buildMonthlyTrend, categoryTotals, getSavingsActivity, getTransactions } from "@/lib/data";

export default async function AnalyticsPage() {
  const [transactions, contributions] = await Promise.all([getTransactions(), getSavingsActivity()]);
  const trend = buildMonthlyTrend(transactions, 8);
  const spending = categoryTotals(transactions.filter((tx) => tx.type === "expense"));
  const income = categoryTotals(transactions.filter((tx) => tx.type === "income"));
  const savingsTrend = contributions.reduce<Record<string, number>>((acc, item) => {
    const key = item.date.slice(0, 7);
    acc[key] = (acc[key] ?? 0) + Number(item.amount);
    return acc;
  }, {});

  return (
    <>
      <PageHeader title="Greining" description="Berðu saman tekjur, útgjöld og framlög í sparnað yfir tíma." />
      <div className="grid gap-5">
        <Card>
          <SectionHeader title="Tekjur og útgjöld" description="Þróun síðustu átta mánaða." />
          <TrendChart data={trend} />
        </Card>
        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <SectionHeader title="Skipting útgjalda" description="Stærstu flokkarnir miðað við öll skráð útgjöld." />
            {spending.length ? <CategoryBars data={spending.slice(0, 8)} /> : <EmptyState>Þú hefur ekki skráð nein útgjöld enn.</EmptyState>}
          </Card>
          <Card>
            <SectionHeader title="Tekjur eftir flokkum" description="Skipting allra skráðra tekna eftir flokkum." />
            {income.length ? <PieBreakdown data={income} centerLabel="Heildartekjur" /> : <EmptyState>Þú hefur ekki skráð neinar tekjur enn.</EmptyState>}
          </Card>
        </div>
        <Card>
          <SectionHeader title="Framlög í sparnað eftir mánuðum" description="Skráð framlög í sparnað í hverjum mánuði." />
          {Object.keys(savingsTrend).length ? (
            <CategoryBars data={Object.entries(savingsTrend).map(([name, value]) => ({ name, value }))} />
          ) : (
            <EmptyState>Þú hefur ekki skráð nein framlög í sparnað enn.</EmptyState>
          )}
        </Card>
      </div>
    </>
  );
}
