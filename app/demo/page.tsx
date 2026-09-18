import type { Metadata } from "next";
import { Suspense } from "react";
import { DemoApp } from "@/components/demo-app";
import { DataSectionLoading } from "@/components/data-section-loading";
import { MarketDataSection } from "@/components/market-data-section";
import { RealEstateOverview } from "@/components/real-estate-overview";
import { getMarketSnapshot } from "@/lib/market-data";
import { getRealEstateSnapshot } from "@/lib/real-estate-data";

export const metadata: Metadata = {
  title: "Sýningarútgáfa | Mín fjármál",
  description: "Skoðaðu Mín fjármál með sýnigögnum án þess að stofna aðgang."
};

async function DemoRealEstate({ data }: { data: ReturnType<typeof getRealEstateSnapshot> }) {
  return <RealEstateOverview data={await data} />;
}

export default async function DemoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const marketData = getMarketSnapshot();
  const realEstateData = getRealEstateSnapshot();
  const { view } = await searchParams;
  const initialView = view === "markets" || view === "realEstate" || view === "transactions" || view === "bills" || view === "savings" || view === "analytics" ? view : "overview";
  return <DemoApp
    initialView={initialView}
    marketSummary={<Suspense fallback={<DataSectionLoading label="Hleð markaðsgögnum…" />}><MarketDataSection data={marketData} compact detailsHref="/demo?view=markets" /></Suspense>}
    marketContent={<Suspense fallback={<DataSectionLoading label="Hleð markaðsgögnum…" />}><MarketDataSection data={marketData} /></Suspense>}
    realEstateContent={<Suspense fallback={<DataSectionLoading label="Hleð fasteignagögnum…" />}><DemoRealEstate data={realEstateData} /></Suspense>}
  />;
}
