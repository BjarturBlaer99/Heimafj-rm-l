import type { Metadata } from "next";
import { MarketOverview } from "@/components/market-overview";
import { getMarketSnapshot } from "@/lib/market-data";

export const metadata: Metadata = {
  title: "Markaðir | Mín fjármál",
  description: "Verðbólga, meginvextir, gengi og hlutabréf á einum stað."
};

export default async function MarketsPage() {
  const marketData = await getMarketSnapshot();

  return (
    <>
      <header className="mb-6 border-b border-line/10 pb-5">
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">Markaðir</h1>
        <p className="mt-1 text-sm text-ink/55">Yfirlit yfir helstu markaðs- og hagstærðir sem hafa áhrif á fjármálin þín.</p>
      </header>
      <MarketOverview data={marketData} />
    </>
  );
}
