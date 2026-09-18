import { MarketOverview } from "@/components/market-overview";
import type { MarketSnapshot } from "@/lib/market-data";

export async function MarketDataSection({
  data,
  compact = false,
  detailsHref
}: {
  data: Promise<MarketSnapshot>;
  compact?: boolean;
  detailsHref?: string;
}) {
  return <MarketOverview data={await data} compact={compact} detailsHref={detailsHref} />;
}
