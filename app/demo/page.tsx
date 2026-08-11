import type { Metadata } from "next";
import { DemoApp } from "@/components/demo-app";
import { getMarketSnapshot } from "@/lib/market-data";
import { getRealEstateSnapshot } from "@/lib/real-estate-data";

export const metadata: Metadata = {
  title: "Sýningarútgáfa | Mín fjármál",
  description: "Skoðaðu Mín fjármál með sýnigögnum án þess að stofna aðgang."
};

export default async function DemoPage() {
  const [marketData, realEstateData] = await Promise.all([getMarketSnapshot(), getRealEstateSnapshot()]);
  return <DemoApp marketData={marketData} realEstateData={realEstateData} />;
}
