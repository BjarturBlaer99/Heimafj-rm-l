import type { Metadata } from "next";
import { DemoApp } from "@/components/demo-app";
import { getMarketSnapshot } from "@/lib/market-data";

export const metadata: Metadata = {
  title: "Sýningarútgáfa | Mín fjármál",
  description: "Skoðaðu Mín fjármál með sýnigögnum án þess að stofna aðgang."
};

export default async function DemoPage() {
  const marketData = await getMarketSnapshot();
  return <DemoApp marketData={marketData} />;
}
