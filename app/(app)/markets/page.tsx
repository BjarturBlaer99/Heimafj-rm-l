import type { Metadata } from "next";
import { Suspense } from "react";
import { DataSectionLoading } from "@/components/data-section-loading";
import { MarketDataSection } from "@/components/market-data-section";
import { PageHeader } from "@/components/ui";
import { getMarketSnapshot } from "@/lib/market-data";

export const metadata: Metadata = {
  title: "Markaðir | Mín fjármál",
  description: "Verðbólga, meginvextir, gengi og hlutabréf á einum stað."
};

export default function MarketsPage() {
  const marketData = getMarketSnapshot();

  return (
    <>
      <PageHeader title="Markaðir" description="Fylgstu með markaðs- og hagstærðum sem hafa áhrif á fjármálin þín." />
      <Suspense fallback={<DataSectionLoading label="Hleð markaðsgögnum…" chart />}>
        <MarketDataSection data={marketData} />
      </Suspense>
    </>
  );
}
