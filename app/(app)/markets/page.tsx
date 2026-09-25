import type { Metadata } from "next";
import { Suspense } from "react";
import { DataSectionLoading } from "@/components/data-section-loading";
import { MarketDataSection } from "@/components/market-data-section";
import { PageHeader } from "@/components/ui";
import { getMarketSnapshot } from "@/lib/market-data";

export const metadata: Metadata = {
  title: "Markaðir | Mín fjármál",
  description: "Fylgstu með hlutabréfum, sjóðum, gengi og stöðu efnahagsmála."
};

export default function MarketsPage() {
  const marketData = getMarketSnapshot();

  return (
    <>
      <PageHeader title="Markaðir" description="Fylgstu með hlutabréfum, sjóðum, gengi og stöðu efnahagsmála." />
      <Suspense fallback={<DataSectionLoading label="Sæki markaðsgögn…" chart />}>
        <MarketDataSection data={marketData} />
      </Suspense>
    </>
  );
}
