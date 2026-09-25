"use client";

import { useState } from "react";
import { ArrowUpIcon as ArrowUp } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { ArrowDownIcon as ArrowDown } from "@phosphor-icons/react/dist/ssr/ArrowDown";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui";
import { money } from "@/lib/format";
import { savingsBucketTemplates } from "@/lib/savings-buckets";
import { selectedSavingsTotal, type SavingsPreferences } from "@/lib/savings-preferences";
import { saveSavingsPreferences } from "@/lib/savings-preferences-actions";
import type { SavingsBucket, SavingsBucketType } from "@/lib/types";
import styles from "./savings-preferences-editor.module.css";

export function SavingsPreferencesEditor({ preferences, buckets }: { preferences: SavingsPreferences; buckets: SavingsBucket[] }) {
  const [draft, setDraft] = useState(preferences);
  const [announcement, setAnnouncement] = useState("");
  const changed = JSON.stringify(draft) !== JSON.stringify(preferences);

  function move(type: SavingsBucketType, direction: -1 | 1) {
    const order = [...draft.order];
    const index = order.indexOf(type);
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    setDraft({ ...draft, order });
    const label = savingsBucketTemplates.find((bucket) => bucket.bucket_type === type)?.label;
    setAnnouncement(`${label} er nú númer ${target + 1} í röðinni.`);
  }

  function toggle(group: "housing" | "goal", type: SavingsBucketType, checked: boolean) {
    const selected = new Set(draft[group]);
    if (checked) selected.add(type); else selected.delete(type);
    setDraft({ ...draft, [group]: savingsBucketTemplates.map((bucket) => bucket.bucket_type).filter((bucket) => selected.has(bucket)) });
  }

  return (
    <section className={styles.panel} id="savings-preferences" aria-labelledby="savings-preferences-heading" data-scroll-reveal>
      <div className={styles.heading}>
        <h2 id="savings-preferences-heading">Sparnaður á þinn hátt</h2>
        <p>Raðaðu flokkunum og veldu hvað telst til húsnæðissparnaðar og sparnaðarmarkmiðsins þíns.</p>
        <p>Áttu þegar húsnæði? Þú getur tekið hakið af séreignarsparnaði svo hann telji ekki lengur með í þessum upphæðum.</p>
      </div>
      <ActionForm action={saveSavingsPreferences}>
        <input type="hidden" name="preferences" value={JSON.stringify(draft)} />
        <ol className={styles.rows}>
          {draft.order.map((type, index) => {
            const label = savingsBucketTemplates.find((bucket) => bucket.bucket_type === type)!.label;
            return (
              <li key={type} className={styles.row}>
                <div className={styles.category}>
                  <span className={styles.index} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <h3>{label}</h3>
                  <div className={styles.moveButtons}>
                    <button type="button" onClick={() => move(type, -1)} disabled={index === 0} aria-label={`Færa ${label} upp`}><ArrowUp size={17} /></button>
                    <button type="button" onClick={() => move(type, 1)} disabled={index === draft.order.length - 1} aria-label={`Færa ${label} niður`}><ArrowDown size={17} /></button>
                  </div>
                </div>
                <div className={styles.choices}>
                  <label><input type="checkbox" checked={draft.housing.includes(type)} onChange={(event) => toggle("housing", type, event.target.checked)} /><span>Telja með í húsnæðissparnaði<span className="sr-only">: {label}</span></span></label>
                  <label><input type="checkbox" checked={draft.goal.includes(type)} onChange={(event) => toggle("goal", type, event.target.checked)} /><span>Telja með í markmiði<span className="sr-only">: {label}</span></span></label>
                </div>
              </li>
            );
          })}
        </ol>
        <div className={styles.footer}>
          <dl className={styles.totals}>
            <div><dt>Í húsnæðissparnaði</dt><dd>{money(selectedSavingsTotal(buckets, draft.housing), "ISK")}</dd></div>
            <div><dt>Í sparnaðarmarkmiði</dt><dd>{money(selectedSavingsTotal(buckets, draft.goal), "ISK")}</dd></div>
          </dl>
          <p className={styles.note}>Þetta breytir aðeins flokkun og röðun. Heildarsparnaður og skráð framlög haldast óbreytt. Val á séreignarsparnaði segir ekki til um hvort hægt sé að ráðstafa honum; um það gilda sérstök skilyrði.</p>
          <div className={styles.actions}><Button type="submit" disabled={!changed}>Vista skiptingu</Button>{changed ? <span>Óvistaðar breytingar</span> : <span>Skiptingin er vistuð á aðganginum þínum.</span>}</div>
        </div>
      </ActionForm>
      <p className="sr-only" role="status">{announcement}</p>
    </section>
  );
}
