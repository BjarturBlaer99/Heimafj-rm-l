import { Suspense } from "react";
import { DashboardOverview } from "@/components/dashboard-overview";
import { DataSectionLoading } from "@/components/data-section-loading";
import { MarketDataSection } from "@/components/market-data-section";
import { SetupChecklist } from "@/components/setup-checklist";
import { getAuthed, getDashboardData } from "@/lib/data";
import { currentMonth } from "@/lib/format";
import { getMarketSnapshot } from "@/lib/market-data";

export default async function DashboardPage() {
  const marketData = getMarketSnapshot();
  const [data, { user }] = await Promise.all([getDashboardData(), getAuthed()]);
  return <DashboardOverview
    data={data}
    month={currentMonth()}
    today={new Date().toISOString().slice(0, 10)}
    setupContent={<SetupChecklist userId={user.id} hasTransactions={data.hasAnyTransactions} hasBills={data.hasAnyBills} hasGoal={data.goals.length > 0} />}
    marketContent={<Suspense fallback={<DataSectionLoading label="Hleð markaðsgögnum…" />}><MarketDataSection data={marketData} compact detailsHref="/markets" /></Suspense>}
  />;
}
