"use client";

import { useState } from "react";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Button, Field, inputClass } from "@/components/ui";
import { cancelAccountDeletion, requestAccountDeletion } from "@/lib/account-actions";
import styles from "@/app/(app)/settings/settings.module.css";

export function AccountDataControls({ requestedAt, supportEmail }: { requestedAt: string | null; supportEmail?: string }) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  async function download(format: "csv" | "json") {
    setDownloading(format);
    setNotice("");
    try {
      const response = await fetch(`/api/data/export?format=${format}`, { cache: "no-store" });
      if (!response.ok || !response.headers.get("content-disposition")) throw new Error("export");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `min-fjarmal-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("Niðurhalið er hafið.");
    } catch { setNotice("Ekki tókst að sækja gögnin. Athugaðu innskráninguna og reyndu aftur."); }
    finally { setDownloading(null); }
  }
  return <div className={styles.dataControls}>
    <div><h3>Sækja gögnin mín</h3><p>CSV fyrir töflureikni. JSON inniheldur líka flokka, áætlanir, reikninga, sparnað og aðgangsupplýsingar.</p>
      <div className={styles.dataButtons}><Button type="button" variant="secondary" disabled={Boolean(downloading)} onClick={() => download("csv")}>{downloading === "csv" ? "Undirbý skrá…" : "Sækja færslur · CSV"}</Button><Button type="button" variant="secondary" disabled={Boolean(downloading)} onClick={() => download("json")}>{downloading === "json" ? "Undirbý skrá…" : "Sækja öll gögn · JSON"}</Button></div>
      <p role="status" aria-live="polite">{notice}</p>
    </div>
    <div><h3>Leiðbeiningar og aðstoð</h3><p>Innflutningur, flokkun og reikningar.</p><div className={styles.dataLinks}><Link href="/help">Opna leiðbeiningar</Link><Link href="/privacy">Um meðferð gagna</Link>{supportEmail ? <a href={`mailto:${supportEmail}`}>Hafa samband</a> : null}</div></div>
    <div id="account-deletion"><h3>Eyða aðgangi</h3><p>Öll gögnin þín hverfa úr kerfinu. Sæktu afrit fyrst.</p><p>Stjórnandi afgreiðir beiðnina. Þangað til geturðu hætt við hér.</p>
      {requestedAt ? <div className={styles.requestStatus}><p role="status">Beiðni skráð {new Intl.DateTimeFormat("is-IS", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(requestedAt))}. Bíður afgreiðslu.</p><ActionForm action={cancelAccountDeletion}><Button type="submit" variant="secondary">Afturkalla beiðni</Button></ActionForm></div> : <ActionForm resetOnSuccess action={requestAccountDeletion} className={styles.deletionForm}><Field label="Skrifaðu EYÐA til staðfestingar"><input name="confirmation" className={inputClass} autoComplete="off" required pattern="EYÐA" placeholder="EYÐA" /></Field><Button type="submit" variant="secondary">Skrá beiðni um eyðingu</Button></ActionForm>}
      {supportEmail ? <p>Spurningar: <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p> : null}
    </div>
  </div>;
}
