"use client";

import { Card } from "@/components/ui/card";
import { ExternalContentControls } from "@/components/external-content-controls";
import { useExternalContentConsent } from "@/components/use-external-content-consent";
import { useAppTheme } from "@/components/use-app-theme";

type MarketWidgetKind = "stocks" | "funds";

const symbolGroups = {
  stocks: {
    title: "Hlutabréf",
    symbols: [
      { s: "NASDAQ:AAPL", d: "Apple" },
      { s: "NASDAQ:MSFT", d: "Microsoft" },
      { s: "NASDAQ:NVDA", d: "NVIDIA" },
      { s: "NASDAQ:GOOGL", d: "Alphabet" },
      { s: "NASDAQ:AMZN", d: "Amazon" },
      { s: "NASDAQ:META", d: "Meta Platforms" },
      { s: "NASDAQ:TSLA", d: "Tesla" }
    ]
  },
  funds: {
    title: "Sjóðir",
    symbols: [
      { s: "AMEX:VOO", d: "Vanguard S&P 500 ETF" },
      { s: "NASDAQ:QQQ", d: "Invesco QQQ Trust" },
      { s: "AMEX:VT", d: "Vanguard Total World Stock ETF" },
      { s: "AMEX:VTI", d: "Vanguard Total Stock Market ETF" },
      { s: "AMEX:SCHD", d: "Schwab U.S. Dividend Equity ETF" }
    ]
  }
} as const;

function widgetUrl(kind: MarketWidgetKind, theme: "light" | "dark") {
    const configuration = JSON.stringify({
      colorTheme: theme,
      dateRange: "12M",
      showChart: true,
      locale: "en",
      isTransparent: false,
      showSymbolLogo: true,
      showFloatingTooltip: true,
      width: "100%",
      height: "100%",
      plotLineColorGrowing: "#16a085",
      plotLineColorFalling: "#e1534b",
      gridLineColor: theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.08)",
      scaleFontColor: theme === "dark" ? "rgba(255, 255, 255, 0.64)" : "rgba(15, 23, 42, 0.58)",
      belowLineFillColorGrowing: "rgba(22, 160, 133, 0.12)",
      belowLineFillColorFalling: "rgba(225, 83, 75, 0.12)",
      belowLineFillColorGrowingBottom: "rgba(22, 160, 133, 0.02)",
      belowLineFillColorFallingBottom: "rgba(225, 83, 75, 0.02)",
      symbolActiveColor: theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.05)",
      tabs: [symbolGroups[kind]]
    });
    // Keep the vendor on its own fixed, cross-origin host. It can use its own
    // origin to render, but cannot access the application's DOM or storage.
    // Never combine allow-same-origin with srcDoc or an application-hosted URL.
    return `https://www.tradingview-widget.com/embed-widget/market-overview/?locale=en#${encodeURIComponent(configuration)}`;
}

export function TradingViewMarketWidget({ kind }: { kind: MarketWidgetKind }) {
  const { choice } = useExternalContentConsent();
  const { theme } = useAppTheme();

  return (
    <Card className="overflow-hidden p-0 sm:p-0">
      {choice === "allowed" ? <div className="relative h-[min(520px,65svh)] min-h-[320px] min-w-0 sm:h-[600px]">
        <iframe
          key={`${kind}-${theme}`}
          title={kind === "stocks" ? "Verð og þróun hlutabréfa frá TradingView" : "Verð og þróun sjóða frá TradingView"}
          src={widgetUrl(kind, theme)}
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div> : null}
      {choice === "allowed" ? <p className="border-t border-line/10 px-5 py-3 text-xs leading-relaxed text-ink/65">Birtist grafið ekki? <a href={widgetUrl(kind, theme)} target="_blank" rel="noopener noreferrer" className="focus-ring rounded text-accent underline underline-offset-4">Opna graf í sérglugga</a>.</p> : null}
      <div className="border-t border-line/10 p-5 sm:p-6"><ExternalContentControls compact /></div>
      <div className="border-t border-line/10 px-4 py-2.5 text-right text-[11px] text-ink/45">
        Markaðsgögn og gröf frá{" "}
        <a
          href="https://www.tradingview.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-ink/65 transition hover:text-accent"
        >
          TradingView
        </a>
      </div>
    </Card>
  );
}
