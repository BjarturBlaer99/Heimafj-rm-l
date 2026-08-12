import type { Metadata } from "next";
import { MarketOverview } from "@/components/market-overview";
import { PageHeader } from "@/components/ui";
import { getMarketSnapshot } from "@/lib/market-data";

export const metadata: Metadata = {
  title: "Markaðir | Mín fjármál",
  description: "Verðbólga, meginvextir, gengi og hlutabréf á einum stað."
};

export default async function MarketsPage() {
  const marketData = await getMarketSnapshot();

  return (
    <>
      <PageHeader title="Markaðir" description="Fylgstu með markaðs- og hagstærðum sem hafa áhrif á fjármálin þín." />
      <MarketOverview data={marketData} />
    </>
  );
}
