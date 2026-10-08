"use client";

import { useActionFeedback } from "@/components/action-feedback";
import { Button } from "@/components/ui";
import { useExternalContentConsent } from "@/components/use-external-content-consent";

export function ExternalContentControls({ compact = false }: { compact?: boolean }) {
  const { choice, setAllowed, resetChoice } = useExternalContentConsent();
  const notify = useActionFeedback();
  function choose(allowed: boolean | null) {
    const persisted = allowed === null ? resetChoice() : setAllowed(allowed);
    notify(persisted
      ? allowed === null ? "Valinu hefur verið eytt. Gröfin hlaðast ekki fyrr en þú leyfir það aftur." : allowed ? "Þú hefur leyft gröf frá TradingView í þessum vafra." : "Slökkt er á gröfum frá TradingView."
      : "Valið gildir á þessari síðu. Vafrinn leyfir ekki að það sé vistað fyrir næstu heimsókn.");
  }
  return <div className="space-y-3 text-sm">
    <h3 className="font-semibold">{compact ? "Gröf frá TradingView" : "Efni frá öðrum þjónustum"}</h3>
    <p className="text-xs leading-relaxed text-ink/65">Hlutabréfa- og sjóðagröf eru sótt til TradingView ef þú leyfir það. Þá fær TradingView IP-tölu þína og upplýsingar um tenginguna og grafið. Fjármálafærslurnar þínar fylgja ekki með. Þú getur notað aðra hluta síðunnar án þess að leyfa gröfin.</p>
    <p className="text-xs leading-relaxed text-ink/65">Valið gildir í þessum vafra í 180 daga. Þú getur afturkallað leyfið hér, í stillingum eða á persónuverndarsíðunni. <a href="https://www.tradingview.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-4">Persónuvernd hjá TradingView</a></p>
    <p className="text-xs font-medium" role="status">{choice === "allowed" ? "TradingView: leyft" : choice === "blocked" ? "TradingView: slökkt" : "TradingView: bíður eftir þínu vali"}</p>
    <div className="flex flex-wrap gap-3">
      {choice === "allowed" ? <Button type="button" variant="secondary" onClick={() => choose(false)}>Afturkalla leyfi</Button> : <Button type="button" variant="secondary" onClick={() => choose(true)}>Leyfa TradingView</Button>}
      {choice === "unselected" ? <Button type="button" variant="secondary" onClick={() => choose(false)}>Halda slökkt</Button> : <Button type="button" variant="secondary" onClick={() => choose(null)}>Gleyma vali</Button>}
    </div>
  </div>;
}
