import { ActionForm } from "@/components/action-form";
import { SavingsContributionForm } from "@/components/savings-contribution-form";
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
  const housingBuckets = savingsBucketsResult.buckets.filter((bucket) => bucket.bucket_type === "serignarsparnadur" || bucket.bucket_type === "husnaedisparnadur");
  const housingSavings = housingBuckets.reduce((sum, bucket) => sum + Number(bucket.amount), 0);
  const emergencyBuckets = savingsBucketsResult.buckets.filter((bucket) => bucket.bucket_type === "hlutabref" || bucket.bucket_type === "sjodir");
  const emergencySavings = emergencyBuckets.reduce((sum, bucket) => sum + Number(bucket.amount), 0);
  const totalGoal = goals[0] ?? null;
  const progress = totalGoal ? (totalSavings / Number(totalGoal.target_amount)) * 100 : 0;
  const remaining = totalGoal ? Math.max(0, Number(totalGoal.target_amount) - totalSavings) : 0;
  const plan = totalGoal && balancesReady ? savingsPlan(totalSavings, Number(totalGoal.target_amount), totalGoal.target_date, isoDate()) : null;

  return (
    <div className={styles.page}>
      <PageHeader title="Sparnaður" description="Yfirsýn yfir það sem þú hefur lagt til hliðar — og næsta markmið." action={balancesReady ? <a href="#savings-balances" className={styles.primaryLink}><Plus size={17} /> Bæta við sparnað</a> : undefined} />
      <FlashMessage code={params.success} />

      <div className={styles.metrics}>
        <MetricCard label="Heildarsparnaður" value={balancesReady ? money(totalSavings, currency) : "—"} detail={balancesReady ? `${savingsBucketsResult.buckets.length} sparnaðarflokkar` : "Ekki tókst að sækja stöðu"} />
        <MetricCard label="Húsnæðissparnaður" value={balancesReady ? money(housingSavings, currency) : "—"} detail="Séreign og húsnæðissparnaður" />
        <MetricCard label="Fjárfestingar" value={balancesReady ? money(emergencySavings, currency) : "—"} detail="Hlutabréf og sjóðir" />
      </div>

      {!balancesReady ? <Card className="mb-5"><EmptyState>Ekki tókst að sækja sparnaðarstöðuna. Engar upphæðir eru sýndar meðan gögnin eru ekki tiltæk. <a className="text-accent underline" href="/savings-goals">Reyna aftur</a></EmptyState></Card> : null}
      {!latestEntriesResult.schemaReady ? <Card className="mb-5"><EmptyState>Ekki tókst að sækja síðasta framlag í hvern flokk. <a className="text-accent underline" href="/savings-goals">Reyna aftur</a></EmptyState></Card> : null}

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
                    <div className={styles.bucketTitle}><h3>{bucket.label}</h3><p>{latestEntriesResult.schemaReady ? latestEntry ? `Síðasta framlag ${money(Number(latestEntry.amount), currency)} · ${dateLabel(latestEntry.date)}` : "Ekkert framlag skráð enn" : "Síðasta framlag er ekki tiltækt"}</p></div>
                    <p className={styles.balance}>{money(Number(bucket.amount), currency)}</p>
                  </div>
                  <section className={styles.contributionSection}>
                    <h4>Bæta við sparnað</h4>
                    <SavingsContributionForm className={styles.contributionForm}>
                      <input type="hidden" name="bucket_type" value={bucket.bucket_type} /><input type="hidden" name="label" value={bucket.label} />
                      <Field label="Upphæð framlags"><input className={inputClass} name="amount" type="number" min="1" step="1" placeholder="0" disabled={!savingsBucketsResult.schemaReady || !savingsEntriesResult.schemaReady} required /></Field>
                      <Field label="Dagsetning"><DateInput name="date" type="date" defaultValue={isoDate()} disabled={!savingsBucketsResult.schemaReady || !savingsEntriesResult.schemaReady} required /></Field>
                      <Field label="Athugasemd (valfrjálst)"><input className={inputClass} name="note" placeholder="T.d. mánaðarlegt framlag" disabled={!savingsBucketsResult.schemaReady || !savingsEntriesResult.schemaReady} /></Field>
                      <Button type="submit" disabled={!savingsBucketsResult.schemaReady || !savingsEntriesResult.schemaReady}><Plus size={17} /> Bæta við sparnað</Button>
                    </SavingsContributionForm>
                  </section>
                  <section className={styles.correctionSection}>
                    <h4>Leiðrétta heildarupphæð</h4>
                    <p className={styles.helpText}>Uppfærir heildarstöðu þessa flokks í stað þess að bæta við framlagi.</p>
                    <ActionForm action={saveSavingsBucket} className={styles.correctionForm}>
                      <input type="hidden" name="bucket_type" value={bucket.bucket_type} /><input type="hidden" name="label" value={bucket.label} />
                      <Field label="Ný heildarupphæð"><input className={inputClass} name="amount" type="number" min="0" step="1" defaultValue={Number(bucket.amount)} disabled={!savingsBucketsResult.schemaReady} /></Field>
                      <Button type="submit" variant="secondary" disabled={!savingsBucketsResult.schemaReady}>Vista heildarupphæð</Button>
                    </ActionForm>
                  </section>
                </article>
              );
            })}
            <div className={styles.balanceTotal}><span>Samtals</span><strong>{balancesReady ? money(totalSavings, currency) : "—"}</strong></div>
          </section>

          <section id="savings-history" className={styles.panel} aria-labelledby="savings-history-heading" data-scroll-reveal>
            <div className={styles.panelHeader}><h2 id="savings-history-heading">Sparnaðarskráningar</h2><p>{savingsEntriesResult.schemaReady ? `${savingsEntriesResult.total} framlög skráð. Nýjustu framlögin birtast fyrst.` : "Skráningar í alla sparnaðarflokka."}</p></div>
            {savingsEntriesResult.schemaReady ? savingsEntriesResult.entries.length ? <div className={styles.history}>{savingsEntriesResult.entries.map((entry) => <div key={entry.id} className={styles.historyRow}><div><p className={styles.entryLabel}>{entry.label}</p><p className={styles.entryMeta}>{dateLabel(entry.date)}{entry.note ? ` · ${entry.note}` : ""}</p></div><p className={styles.entryAmount}>+{money(Number(entry.amount), currency)}</p></div>)}</div> : <div className={styles.empty}><EmptyState>Engin framlög skráð enn. Veldu sparnaðarflokk hér að ofan og bættu við fyrsta framlaginu.</EmptyState></div> : <div className={styles.empty}><EmptyState>Sparnaðarsaga er ekki tiltæk sem stendur. <a className="text-accent underline" href="/savings-goals#savings-history">Reyna aftur</a></EmptyState></div>}
            {savingsEntriesResult.schemaReady && savingsEntriesResult.pageCount > 1 ? <nav className={styles.historyPagination} aria-label="Síður sparnaðarskráninga"><span>Síða {savingsEntriesResult.page} af {savingsEntriesResult.pageCount}</span><div>{savingsEntriesResult.page > 1 ? <Link href={`/savings-goals?history_page=${savingsEntriesResult.page - 1}#savings-history`}>Fyrri síða</Link> : null}{savingsEntriesResult.page < savingsEntriesResult.pageCount ? <Link href={`/savings-goals?history_page=${savingsEntriesResult.page + 1}#savings-history`}>Næsta síða</Link> : null}</div></nav> : null}
          </section>
        </div>

        <aside className={styles.goalPanel} aria-labelledby="goal-heading" data-scroll-reveal>
          <p className={styles.eyebrow}>Næsta skref</p>
          <h2 id="goal-heading">Sparnaðarmarkmið</h2>
          {!balancesReady ? <p className={styles.goalIntro}>Framvinda og mánaðarlegt framlag birtast þegar sparnaðarstaðan er tiltæk á ný.</p> : totalGoal ? (
            <>
              <h3 className={styles.goalTitle}>{totalGoal.title}</h3>
              <p className={styles.goalDate}>{totalGoal.target_date ? `Markdagur ${dateLabel(totalGoal.target_date)}` : "Enginn markdagur"}</p>
              <div className={styles.progressHeader}><span>{percent(progress)}</span><p>af markmiði náð</p></div>
              <ProgressBar value={progress} />
              <dl className={styles.goalAmounts}><div><dt>Núverandi sparnaður</dt><dd>{money(totalSavings, currency)}</dd></div><div><dt>Markupphæð</dt><dd>{money(Number(totalGoal.target_amount), currency)}</dd></div><div className={styles.remaining}><dt>Eftir að spara</dt><dd>{money(remaining, currency)}</dd></div></dl>
              <div className={styles.contributionPlan}>
                {plan?.status === "active" ? <><p>Mánaðarlegt framlag að markmiði</p><strong>{money(plan.monthlyAmount, currency)}</strong><span>Miðað við {plan.months} {plan.months === 1 ? "framlag" : "framlög"}, eitt í hverjum mánuði frá og með þessum mánuði til markdags. Enginn vöxtur eða ávöxtun er reiknuð.</span></> : plan?.status === "met" ? <><strong>Markupphæð náð</strong><span>Skráður sparnaður nær markmiðinu. Þú getur uppfært markmiðið hér fyrir neðan.</span></> : plan?.status === "overdue" ? <><strong>Markdagur er liðinn</strong><span>Enn vantar {money(plan.remaining, currency)}. Veldu nýjan markdag til að reikna mánaðarlegt framlag.</span></> : plan?.status === "undated" ? <><strong>Hvenær viltu ná markmiðinu?</strong><span>Veldu markdag hér fyrir neðan til að sjá hvað þarf að leggja fyrir í hverjum mánuði.</span></> : <span>Ekki tókst að reikna framlag. Athugaðu markupphæð og markdag.</span>}
              </div>
              <section className={styles.goalEdit}>
                <h3>Breyta markmiði</h3>
                <ActionForm action={saveSavingsGoal} className={styles.goalForm}>
                  <input type="hidden" name="id" value={totalGoal.id} /><input type="hidden" name="current_amount" value={String(totalSavings)} />
                  <Field label="Titill markmiðs"><input className={inputClass} name="title" defaultValue={totalGoal.title} placeholder="Titill markmiðs" required /></Field>
                  <Field label="Markupphæð"><input className={inputClass} name="target_amount" type="number" min="0.01" step="0.01" defaultValue={Number(totalGoal.target_amount)} placeholder="Markupphæð" required /></Field>
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
              <p className={styles.goalIntro}>Gefðu sparnaðinum tilgang. Settu markupphæð og fylgstu með framvindunni hér.</p>
              <ActionForm resetOnSuccess action={saveSavingsGoal} className={styles.goalForm}>
                <Field label="Titill markmiðs"><input className={inputClass} name="title" placeholder="T.d. útborgun í íbúð" required /></Field>
                <Field label="Markupphæð"><input className={inputClass} name="target_amount" type="number" min="0.01" step="0.01" placeholder="0" required /></Field>
                <Field label="Markdagur (valfrjálst)"><DateInput name="target_date" type="date" /></Field>
                <input type="hidden" name="current_amount" value={String(totalSavings)} />
                <Button type="submit"><Plus size={17} /> Vista markmið</Button>
              </ActionForm>
            </>
          )}
          <p className={styles.goalNote}>Framvindan miðast við heildarstöðu allra sparnaðarflokka og uppfærist þegar þú skráir breytingar.</p>
        </aside>
      </div>

      {goals.length > 1 ? <Card className="mt-5"><EmptyState>Það fundust fleiri en eitt sparnaðarmarkmið úr eldri uppsetningu. Nú er aðeins eitt heildarsparnaðarmarkmið notað hér.</EmptyState></Card> : null}
    </div>
  );
}
