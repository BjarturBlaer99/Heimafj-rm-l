"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { useExternalContentConsent } from "@/components/use-external-content-consent";

export function ExternalContentControls({ compact = false }: { compact?: boolean }) {
  const { choice, setAllowed, resetChoice } = useExternalContentConsent();
  const [notice, setNotice] = useState("");
  function choose(allowed: boolean | null) {
    const persisted = allowed === null ? resetChoice() : setAllowed(allowed);
    setNotice(persisted
      ? allowed === null ? "Valinu var eytt. Gröfin hlaðast ekki nema þú leyfir þau." : allowed ? "Þú hefur leyft gröf frá TradingView í þessum vafra." : "Slökkt er á gröfum frá TradingView."
      : "Valið gildir bara á þessari síðu. Vafrinn leyfði ekki að vista það.");
  }
  return <div className="space-y-3 text-sm">
    <h3 className="font-semibold">{compact ? "Gröf frá TradingView" : "Efni frá öðrum þjónustum"}</h3>
    <p className="text-xs leading-relaxed text-ink/65">Gröf af hlutabréfum og sjóðum koma frá TradingView. Ef þú leyfir þau fær TradingView IP-töluna þína og upplýsingar um tenginguna, en ekki færslurnar þínar.</p>
    <p className="text-xs leading-relaxed text-ink/65">Valið gildir í þessum vafra í 180 daga og þú getur breytt því hvenær sem er. <a href="https://www.tradingview.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-4">Persónuvernd hjá TradingView</a></p>
    <p className="text-xs font-medium" role="status">{choice === "allowed" ? "TradingView: leyft" : choice === "blocked" ? "TradingView: slökkt" : "TradingView: bíður eftir þínu vali"}</p>
    <div className="flex flex-wrap gap-3">
      {choice === "allowed" ? <Button type="button" variant="secondary" onClick={() => choose(false)}>Afturkalla leyfi</Button> : <Button type="button" variant="secondary" onClick={() => choose(true)}>Leyfa TradingView</Button>}
      {choice === "unselected" ? <Button type="button" variant="secondary" onClick={() => choose(false)}>Halda slökkt</Button> : <Button type="button" variant="secondary" onClick={() => choose(null)}>Gleyma vali</Button>}
    </div>
    {notice ? <p role="status" aria-live="polite" className="text-xs leading-relaxed text-ink/65">{notice}</p> : null}
  </div>;
}
