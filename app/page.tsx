import type { Metadata } from "next";
import { DemoApp } from "@/components/demo-app";
import { getMarketSnapshot } from "@/lib/market-data";

export const metadata: Metadata = {
  title: "Mín fjármál | Sýningarútgáfa",
  description: "Skoðaðu Mín fjármál með sýnigögnum án þess að stofna aðgang."
};

export default async function HomePage() {
  const marketData = await getMarketSnapshot();
  return <DemoApp marketData={marketData} />;
}
