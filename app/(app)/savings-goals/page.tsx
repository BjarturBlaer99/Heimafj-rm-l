import { ActionForm } from "@/components/action-form";
import { AmountInput } from "@/components/amount-input";
import { SavingsContributionForm } from "@/components/savings-contribution-form";
import { SavingsPreferencesEditor } from "@/components/savings-preferences-editor";
import Link from "next/link";
import { PlusIcon as Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { TrashIcon as Trash2 } from "@phosphor-icons/react/dist/ssr/Trash";
import { ConfirmButton } from "@/components/confirm-button";
import { FlashMessage } from "@/components/flash-message";
import { Button, Card, DateInput, EmptyState, Field, MetricCard, PageHeader, ProgressBar, inputClass } from "@/components/ui";
import { deleteSavingsGoal, saveSavingsBucket, saveSavingsGoal } from "@/lib/actions";
import { getSavingsBuckets, getSavingsGoals } from "@/lib/data";
import { getLatestSavingsEntries, getSavingsHistory } from "@/lib/savings-data";
import { savingsPlan } from "@/lib/savings-plan";
import { selectedSavingsTotal } from "@/lib/savings-preferences";
import { isoDate, money, percent } from "@/lib/format";
import styles from "./savings.module.css";

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("is-IS", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date.slice(0, 10)}T12:00:00Z`));
}

export default async function SavingsGoalsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const requestedHistoryPage = Number(params.history_page ?? 1);
  const [goals, savingsBucketsResult, latestEntriesResult, savingsEntriesResult] = await Promise.all([getSavingsGoals(), getSavingsBuckets(), getLatestSavingsEntries(), getSavingsHistory(requestedHistoryPage)]);
  const currency = "ISK";
  const balancesReady = savingsBucketsResult.schemaReady;
  const latestEntriesByBucket = new Map(latestEntriesResult.entries.map((entry) => [entry.bucket_type, entry]));
  const totalSavings = savingsBucketsResult.buckets.reduce((sum, bucket) => sum + Number(bucket.amount), 0);
  const preferences = savingsBucketsResult.preferences;
  const housingBuckets = savingsBucketsResult.buckets.filter((bucket) => preferences.housing.includes(bucket.bucket_type));
  const housingSavings = housingBuckets.reduce((sum, bucket) => sum + Number(bucket.amount), 0);
  const otherSavings = totalSavings - housingSavings;
  const goalSavings = selectedSavingsTotal(savingsBucketsResult.buckets, preferences.goal);
  const goalBucketLabels = savingsBucketsResult.buckets.filter((bucket) => preferences.goal.includes(bucket.bucket_type)).map((bucket) => bucket.label);
  const totalGoal = goals[0] ?? null;
  const progress = totalGoal ? (goalSavings / Number(totalGoal.target_amount)) * 100 : 0;
  const remaining = totalGoal ? Math.max(0, Number(totalGoal.target_amount) - goalSavings) : 0;
  const plan = totalGoal && balancesReady ? savingsPlan(goalSavings, Number(totalGoal.target_amount), totalGoal.target_date, isoDate()) : null;

  return (
    <div className={styles.page}>
      <PageHeader title="Sparnaður" description="Haltu utan um sparnaðinn þinn og sjáðu hvað vantar upp á markmiðið." action={balancesReady ? <a href="#savings-balances" className={styles.primaryLink}><Plus size={17} /> Skrá framlag</a> : undefined} />
      <FlashMessage code={params.success} />

      <div className={styles.metrics}>
        <MetricCard label="Heildarsparnaður" value={balancesReady ? money(totalSavings, currency) : "—"} detail={balancesReady ? `${savingsBucketsResult.buckets.length} sparnaðarflokkar` : "Ekki tókst að sækja stöðu"} />
        <MetricCard label="Húsnæðissparnaður" value={balancesReady ? money(housingSavings, currency) : "—"} detail={housingBuckets.length ? housingBuckets.map((bucket) => bucket.label).join(" · ") : "Engir flokkar valdir"} />
        <MetricCard label="Annar sparnaður" value={balancesReady ? money(otherSavings, currency) : "—"} detail="Sparnaður utan húsnæðisflokkanna" />
      </div>

      {!balancesReady ? <Card className="mb-5"><EmptyState>Ekki tókst að sækja stöðu sparnaðarins. Upphæðirnar birtast þegar tenging næst aftur. <a className="text-accent underline" href="/savings-goals">Reyna aftur</a></EmptyState></Card> : null}
      {!latestEntriesResult.schemaReady ? <Card className="mb-5"><EmptyState>Ekki tókst að sækja síðasta framlag í hvern flokk. <a className="text-accent underline" href="/savings-goals">Reyna aftur</a></EmptyState></Card> : null}
      {balancesReady ? <SavingsPreferencesEditor key={JSON.stringify(preferences)} preferences={preferences} buckets={savingsBucketsResult.buckets} /> : null}

      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          <section className={styles.panel} id="savings-balances" aria-labelledby="balances-heading">
            <div data-scroll-reveal="" className={styles.panelHeader}><h2 id="balances-heading">Skipting sparnaðar</h2><p>Skráðu framlag í flokk eða leiðréttu núverandi stöðu.</p></div>
            <div className={styles.balanceLabels} aria-hidden="true"><span>Sparnaðarflokkur</span><span>Núverandi staða</span></div>
            {savingsBucketsResult.buckets.map((bucket, index) => {
              const latestEntry = latestEntriesByBucket.get(bucket.bucket_type);
              return (
                <article key={bucket.bucket_type} className={styles.bucket} data-scroll-reveal>
                  <div className={styles.balanceRow}>
                    <span className={styles.bucketIndex} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <div className={styles.bucketTitle}><h3>{bucket.label}</h3><p>{latestEntriesResult.schemaReady ? latestEntry ? `Síðasta framlag ${money(Number(latestEntry.amount), currency)} · ${dateLabel(latestEntry.date)}` : "Þú hefur ekki skráð framlag enn" : "Ekki tókst að sækja síðasta framlag"}</p></div>
                    <p className={styles.balance}>{money(Number(bucket.amount), currency)}</p>
                  </div>
                  <section className={styles.contributionSection}>
                    <h4>Skrá framlag</h4>
                    <SavingsContributionForm className={styles.contributionForm}>
                      <input type="hidden" name="bucket_type" value={bucket.bucket_type} /><input type="hidden" name="label" value={bucket.label} />
                      <Field label="Upphæð framlags"><AmountInput className={inputClass} name="amount" min="1" step="1" placeholder="0" disabled={!savingsBucketsResult.schemaReady || !savingsEntriesResult.schemaReady} required /></Field>
                      <Field label="Dagsetning"><DateInput name="date" type="date" defaultValue={isoDate()} disabled={!savingsBucketsResult.schemaReady || !savingsEntriesResult.schemaReady} required /></Field>
                      <Field label="Athugasemd (valfrjálst)"><input className={inputClass} name="note" placeholder="T.d. mánaðarlegt framlag" disabled={!savingsBucketsResult.schemaReady || !savingsEntriesResult.schemaReady} /></Field>
                      <Button type="submit" disabled={!savingsBucketsResult.schemaReady || !savingsEntriesResult.schemaReady}><Plus size={17} /> Skrá framlag</Button>
                    </SavingsContributionForm>
                  </section>
                  <section className={styles.correctionSection}>
                    <h4>Leiðrétta heildarupphæð</h4>
                    <p className={styles.helpText}>Notaðu þetta ef þú vilt leiðrétta stöðuna í flokknum. Upphæðin kemur í stað núverandi stöðu og telst ekki nýtt framlag.</p>
                    <ActionForm action={saveSavingsBucket} className={styles.correctionForm}>
                      <input type="hidden" name="bucket_type" value={bucket.bucket_type} /><input type="hidden" name="label" value={bucket.label} />
                      <Field label="Ný heildarupphæð"><AmountInput className={inputClass} name="amount" min="0" step="1" defaultValue={Number(bucket.amount)} disabled={!savingsBucketsResult.schemaReady} /></Field>
                      <Button type="submit" variant="secondary" disabled={!savingsBucketsResult.schemaReady}>Vista heildarupphæð</Button>
                    </ActionForm>
                  </section>
                </article>
              );
            })}
            <div className={styles.balanceTotal}><span>Samtals</span><strong>{balancesReady ? money(totalSavings, currency) : "—"}</strong></div>
          </section>

          <section id="savings-history" className={styles.panel} aria-labelledby="savings-history-heading" data-scroll-reveal>
            <div className={styles.panelHeader}><h2 id="savings-history-heading">Framlög í sparnað</h2><p>{savingsEntriesResult.schemaReady ? `Fjöldi framlaga: ${savingsEntriesResult.total}. Nýjustu framlögin birtast fyrst.` : "Framlög í alla sparnaðarflokka."}</p></div>
            {savingsEntriesResult.schemaReady ? savingsEntriesResult.entries.length ? <div className={styles.history}>{savingsEntriesResult.entries.map((entry) => <div key={entry.id} className={styles.historyRow}><div><p className={styles.entryLabel}>{entry.label}</p><p className={styles.entryMeta}>{dateLabel(entry.date)}{entry.note ? ` · ${entry.note}` : ""}</p></div><p className={styles.entryAmount}>+{money(Number(entry.amount), currency)}</p></div>)}</div> : <div className={styles.empty}><EmptyState>Þú hefur ekki skráð framlag enn. Veldu flokk hér fyrir ofan til að byrja.</EmptyState></div> : <div className={styles.empty}><EmptyState>Ekki tókst að sækja fyrri framlög. <a className="text-accent underline" href="/savings-goals#savings-history">Reyna aftur</a></EmptyState></div>}
            {savingsEntriesResult.schemaReady && savingsEntriesResult.pageCount > 1 ? <nav className={styles.historyPagination} aria-label="Síður með framlögum í sparnað"><span>Síða {savingsEntriesResult.page} af {savingsEntriesResult.pageCount}</span><div>{savingsEntriesResult.page > 1 ? <Link href={`/savings-goals?history_page=${savingsEntriesResult.page - 1}#savings-history`}>Fyrri síða</Link> : null}{savingsEntriesResult.page < savingsEntriesResult.pageCount ? <Link href={`/savings-goals?history_page=${savingsEntriesResult.page + 1}#savings-history`}>Næsta síða</Link> : null}</div></nav> : null}
          </section>
        </div>

        <aside className={styles.goalPanel} aria-labelledby="goal-heading" data-scroll-reveal>
          <p className={styles.eyebrow}>Það sem þú stefnir að</p>
          <h2 id="goal-heading">Sparnaðarmarkmið</h2>
          {!balancesReady ? <p className={styles.goalIntro}>Þegar tenging næst aftur sérðu hvað vantar upp á markmiðið og hvað þarf að leggja fyrir.</p> : totalGoal ? (
            <>
              <h3 className={styles.goalTitle}>{totalGoal.title}</h3>
              <p className={styles.goalDate}>{totalGoal.target_date ? `Markdagur ${dateLabel(totalGoal.target_date)}` : "Enginn markdagur"}</p>
              <div className={styles.progressHeader}><span>{percent(progress)}</span><p>af markupphæð</p></div>
              <ProgressBar value={progress} />
              <dl className={styles.goalAmounts}><div><dt>Sparnaður í markmiði</dt><dd>{money(goalSavings, currency)}</dd></div><div><dt>Markupphæð</dt><dd>{money(Number(totalGoal.target_amount), currency)}</dd></div><div className={styles.remaining}><dt>Eftir að spara</dt><dd>{money(remaining, currency)}</dd></div></dl>
              <div className={styles.contributionPlan}>
                {plan?.status === "active" ? <><p>Það sem þarf að leggja fyrir á mánuði</p><strong>{money(plan.monthlyAmount, currency)}</strong><span>Miðað við {plan.months} {plan.months === 1 ? "framlag" : "framlög"}, eitt í hverjum mánuði frá og með þessum mánuði til markdags. Ekki er reiknað með vöxtum eða annarri ávöxtun.</span></> : plan?.status === "met" ? <><strong>Markupphæð náð</strong><span>Þú hefur náð markupphæðinni miðað við skráðan sparnað. Þú getur sett þér nýtt markmið hér fyrir neðan.</span></> : plan?.status === "overdue" ? <><strong>Markdagur er liðinn</strong><span>Enn vantar {money(plan.remaining, currency)}. Veldu nýjan markdag til að reikna mánaðarlegt framlag.</span></> : plan?.status === "undated" ? <><strong>Hvenær viltu ná markmiðinu?</strong><span>Veldu markdag hér fyrir neðan til að sjá hvað þarf að leggja fyrir í hverjum mánuði.</span></> : <span>Ekki tókst að reikna mánaðarlegt framlag. Athugaðu upphæðina og dagsetninguna.</span>}
              </div>
              <section className={styles.goalEdit}>
                <h3>Breyta markmiði</h3>
                <ActionForm action={saveSavingsGoal} className={styles.goalForm}>
                  <input type="hidden" name="id" value={totalGoal.id} /><input type="hidden" name="current_amount" value={String(goalSavings)} />
                  <Field label="Heiti markmiðs"><input className={inputClass} name="title" defaultValue={totalGoal.title} placeholder="Heiti markmiðs" required /></Field>
                  <Field label="Markupphæð"><AmountInput className={inputClass} name="target_amount" min="0.01" step="0.01" defaultValue={Number(totalGoal.target_amount)} placeholder="Markupphæð" required /></Field>
                  <Field label="Markdagur (valfrjálst)"><DateInput name="target_date" type="date" defaultValue={totalGoal.target_date ?? ""} /></Field>
                  <Button type="submit" variant="secondary">Vista breytingar</Button>
                </ActionForm>
                <ActionForm action={deleteSavingsGoal} className={styles.deleteGoal}>
                  <input type="hidden" name="id" value={totalGoal.id} />
                  <ConfirmButton variant="danger" title="Eyða markmiði" confirmMessage={`Ertu viss um að þú viljir eyða sparnaðarmarkmiðinu "${totalGoal.title}"?`}><Trash2 size={16} /> Eyða markmiði</ConfirmButton>
                </ActionForm>
              </section>
            </>
          ) : (
            <>
              <p className={styles.goalIntro}>Hvað viltu spara mikið? Skráðu markmiðið og sjáðu hvað er eftir.</p>
              <ActionForm resetOnSuccess action={saveSavingsGoal} className={styles.goalForm}>
                <Field label="Heiti markmiðs"><input className={inputClass} name="title" placeholder="T.d. útborgun í íbúð" required /></Field>
                <Field label="Markupphæð"><AmountInput className={inputClass} name="target_amount" min="0.01" step="0.01" placeholder="0" required /></Field>
                <Field label="Markdagur (valfrjálst)"><DateInput name="target_date" type="date" /></Field>
                <input type="hidden" name="current_amount" value={String(goalSavings)} />
                <Button type="submit"><Plus size={17} /> Vista markmið</Button>
              </ActionForm>
            </>
          )}
          <p className={styles.goalNote}>{goalBucketLabels.length ? `Þessir flokkar telja með: ${goalBucketLabels.join(" · ")}.` : "Engir flokkar telja með í markmiðinu enn."} <a href="#savings-preferences" className="text-accent underline">Breyta vali á flokkum</a></p>
        </aside>
      </div>

      {goals.length > 1 ? <Card className="mt-5"><EmptyState>Þú átt fleiri en eitt eldra sparnaðarmarkmið. Hér birtist aðeins nýjasta markmiðið og þeir flokkar sem þú hefur valið telja með.</EmptyState></Card> : null}
    </div>
  );
}
