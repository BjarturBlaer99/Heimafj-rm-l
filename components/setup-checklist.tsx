"use client";

import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import Link from "next/link";
import { useCallback, useSyncExternalStore } from "react";
import styles from "./setup-checklist.module.css";

const changeEvent = "finance-setup-change";
function subscribe(onChange: () => void) {
  window.addEventListener(changeEvent, onChange);
  window.addEventListener("storage", onChange);
  return () => { window.removeEventListener(changeEvent, onChange); window.removeEventListener("storage", onChange); };
}
const serverSnapshot = () => "";

export function SetupChecklist({ userId, hasTransactions, hasBills, hasGoal }: {
  userId: string;
  hasTransactions: boolean;
  hasBills: boolean;
  hasGoal: boolean;
}) {
  const storageKey = `finance-first-month:${userId}`;
  const getSnapshot = useCallback(() => {
    try { return window.localStorage.getItem(storageKey) ?? ""; } catch { return ""; }
  }, [storageKey]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  let reviewed = false;
  let noBills = false;
  try {
    const saved: unknown = JSON.parse(snapshot);
    if (saved && typeof saved === "object") {
      reviewed = "reviewed" in saved && saved.reviewed === true;
      noBills = "noBills" in saved && saved.noBills === true;
    }
  } catch { /* No device-local acknowledgement has been saved yet. */ }

  function acknowledge(key: "reviewed" | "noBills", value: boolean) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ reviewed, noBills, [key]: value }));
      window.dispatchEvent(new Event(changeEvent));
    } catch { /* The checklist remains unfinished if the browser cannot save it. */ }
  }

  const complete = [hasTransactions, reviewed, hasBills || noBills, hasGoal];
  const count = complete.filter(Boolean).length;
  return (
    <section data-scroll-reveal="" className={styles.checklist} aria-labelledby="setup-title">
      <header className={styles.heading}><div><h2 id="setup-title">Fyrsti mánuðurinn</h2><p>Fjögur skref til að byrja.</p></div><span>{count} af 4 skrefum lokið</span></header>
      <ol className={styles.steps}>
        <li><span className={styles.status} data-complete={complete[0]} aria-label={complete[0] ? "Lokið" : "Ólokið"}>{complete[0] ? <CheckIcon size={14} aria-hidden="true" /> : "1"}</span><div><h3>Skráðu fyrstu færslurnar</h3><p>Handvirkt eða úr CSV- eða Excel-skrá.</p><div className={styles.links}><Link href="/transactions#new-transaction">Skrá færslu</Link><Link href="/transactions#import-transactions">Flytja inn</Link></div></div></li>
        <li><span className={styles.status} data-complete={complete[1]} aria-label={complete[1] ? "Lokið" : "Ólokið"}>{complete[1] ? <CheckIcon size={14} aria-hidden="true" /> : "2"}</span><div><h3>Yfirfarðu flokkunina</h3><p>Leiðréttu flokkana á innfluttum færslum.</p><div className={styles.links}><Link href="/transactions">Skoða færslur</Link><button type="button" onClick={() => acknowledge("reviewed", !reviewed)} aria-pressed={reviewed}>{reviewed ? "Merkja sem óyfirfarið" : "Ég hef yfirfarið flokkana"}</button></div></div></li>
        <li><span className={styles.status} data-complete={complete[2]} aria-label={complete[2] ? "Lokið" : "Ólokið"}>{complete[2] ? <CheckIcon size={14} aria-hidden="true" /> : "3"}</span><div><h3>Skráðu reikningana þína</h3><p>Upphæðir og gjalddagar.</p><div className={styles.links}><Link href="/bills">Opna reikninga</Link>{!hasBills && <button type="button" onClick={() => acknowledge("noBills", !noBills)} aria-pressed={noBills}>{noBills ? "Ég vil skrá reikninga" : "Ég hef enga reikninga að skrá"}</button>}</div></div></li>
        <li><span className={styles.status} data-complete={complete[3]} aria-label={complete[3] ? "Lokið" : "Ólokið"}>{complete[3] ? <CheckIcon size={14} aria-hidden="true" /> : "4"}</span><div><h3>Veldu sparnaðarmarkmið</h3><p>Hversu mikið, og fyrir hvenær.</p><div className={styles.links}><Link href="/savings-goals">Opna sparnað</Link></div></div></li>
      </ol>
      <p className={styles.note}>Hök í skrefum 2 og 3 vistast aðeins í þessum vafra. <Link href="/help">Leiðbeiningar</Link></p>
    </section>
  );
}
