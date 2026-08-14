"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";

type MarketWidgetKind = "stocks" | "funds";
type WidgetState = "loading" | "ready" | "error";

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

function currentTheme() {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function TradingViewMarketWidget({ kind }: { kind: MarketWidgetKind }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [state, setState] = useState<WidgetState>("loading");

  useEffect(() => {
    const updateTheme = () => setTheme(currentTheme());
    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    setState("loading");
    container.replaceChildren();

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js";
    script.type = "text/javascript";
    script.async = true;
    script.textContent = JSON.stringify({
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
    script.addEventListener("load", () => {
      if (!cancelled) setState("ready");
    });
    script.addEventListener("error", () => {
      if (!cancelled) setState("error");
    });

    container.append(widget, script);

    return () => {
      cancelled = true;
      container.replaceChildren();
    };
  }, [kind, theme]);

  return (
    <Card className="overflow-hidden p-0">
      <div className="relative h-[520px] min-w-0 sm:h-[600px]">
        <div
          ref={containerRef}
          className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full"
          aria-label={kind === "stocks" ? "Lifandi hlutabréfagögn" : "Lifandi sjóðagögn"}
        />
        {state === "loading" ? (
          <div className="absolute inset-0 grid place-items-center bg-surface text-sm font-semibold text-ink/45">
            Sæki markaðsgögn...
          </div>
        ) : null}
        {state === "error" ? (
          <div className="absolute inset-0 grid place-items-center bg-surface px-6 text-center">
            <div>
              <p className="font-bold">Markaðsgögn eru tímabundið ekki tiltæk</p>
              <p className="mt-1 text-sm text-ink/50">Prófaðu að endurhlaða síðuna eftir smástund.</p>
            </div>
          </div>
        ) : null}
      </div>
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
