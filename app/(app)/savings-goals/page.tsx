import { Plus, Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/confirm-button";
import { Button, Card, EmptyState, PageHeader, ProgressBar, inputClass } from "@/components/ui";
import { addSavingsBucketAmount, deleteSavingsGoal, saveSavingsBucket, saveSavingsGoal } from "@/lib/actions";
import { getSavingsBucketEntries, getSavingsBuckets, getSavingsGoals } from "@/lib/data";
import { isoDate, money, percent } from "@/lib/format";

export default async function SavingsGoalsPage() {
  const [goals, savingsBucketsResult, savingsEntriesResult] = await Promise.all([getSavingsGoals(), getSavingsBuckets(), getSavingsBucketEntries()]);
  const currency = "ISK";
  const latestEntriesByBucket = new Map(savingsEntriesResult.entries.map((entry) => [entry.bucket_type, entry]));
  const totalSavings = savingsBucketsResult.buckets.reduce((sum, bucket) => sum + Number(bucket.amount), 0);
  const housingBuckets = savingsBucketsResult.buckets.filter(
    (bucket) => bucket.bucket_type === "serignarsparnadur" || bucket.bucket_type === "husnaedisparnadur"
  );
  const housingSavings = housingBuckets.reduce((sum, bucket) => sum + Number(bucket.amount), 0);
  const emergencyBuckets = savingsBucketsResult.buckets.filter((bucket) => bucket.bucket_type === "hlutabref" || bucket.bucket_type === "sjodir");
  const emergencySavings = emergencyBuckets.reduce((sum, bucket) => sum + Number(bucket.amount), 0);
  const totalGoal = goals[0] ?? null;
  const progress = totalGoal ? (totalSavings / Number(totalGoal.target_amount)) * 100 : 0;
  const remaining = totalGoal ? Math.max(0, Number(totalGoal.target_amount) - totalSavings) : 0;

  return (
    <>
      <PageHeader title="Sparnaður" />

      {!savingsBucketsResult.schemaReady ? (
        <Card className="mb-5 border-gold/60 bg-gold/10">
          <p className="font-semibold">Sparnaðarflokkar eru ekki komnir í gagnagrunninn enn.</p>
          <p className="mt-2 text-sm text-ink/75">
            Til að vista heildarsparnað og skiptinguna hans þarftu að keyra
            <code className="ml-1 rounded bg-surface px-1.5 py-0.5">supabase/savings-buckets-update.sql</code> í Supabase SQL Editor.
          </p>
        </Card>
      ) : null}

      <Card className="mb-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Heildarsparnaður</h2>
            <p className="text-sm text-ink/55">Skiptu upp raunverulegum sparnaði eftir tegund.</p>
          </div>
          <p className="text-3xl font-bold text-moss">{money(totalSavings, currency)}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {savingsBucketsResult.buckets.map((bucket) => (
            <div key={bucket.bucket_type} className="rounded-lg border border-line/10 bg-surface/70 p-4">
              <p className="text-sm font-semibold text-ink/60">{bucket.label}</p>
              <p className="mt-2 text-xl font-bold">{money(Number(bucket.amount), currency)}</p>
              {savingsEntriesResult.schemaReady ? (
                <p className="mt-1 text-xs text-ink/55">
                  Síðast bætt við:{" "}
                  {latestEntriesByBucket.get(bucket.bucket_type)
                    ? `${money(Number(latestEntriesByBucket.get(bucket.bucket_type)?.amount ?? 0), currency)} þann ${latestEntriesByBucket.get(bucket.bucket_type)?.date}`
                    : "ekkert skráð enn"}
                </p>
              ) : (
                <p className="mt-1 text-xs text-coral">Keyrðu `supabase/savings-bucket-entries-update.sql` til að sjá síðustu skráningu.</p>
              )}
              <form action={addSavingsBucketAmount} className="mt-4 grid gap-2">
                <input type="hidden" name="bucket_type" value={bucket.bucket_type} />
                <input type="hidden" name="label" value={bucket.label} />
                <input className={inputClass} name="amount" type="number" min="1" step="1" placeholder="Upphæð til að bæta við" disabled={!savingsBucketsResult.schemaReady || !savingsEntriesResult.schemaReady} required />
                <input className={inputClass} name="date" type="date" defaultValue={isoDate()} disabled={!savingsBucketsResult.schemaReady || !savingsEntriesResult.schemaReady} required />
                <input className={inputClass} name="note" placeholder="Athugasemd (valfrjálst)" disabled={!savingsBucketsResult.schemaReady || !savingsEntriesResult.schemaReady} />
                <Button type="submit" variant="secondary" className="w-full" disabled={!savingsBucketsResult.schemaReady || !savingsEntriesResult.schemaReady}>
                  <Plus size={17} />
                  Bæta við sparnað
                </Button>
              </form>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold text-moss">Leiðrétta heildarupphæð</summary>
                <form action={saveSavingsBucket} className="mt-3 grid gap-2">
                  <input type="hidden" name="bucket_type" value={bucket.bucket_type} />
                  <input type="hidden" name="label" value={bucket.label} />
                  <input className={inputClass} name="amount" type="number" min="0" step="1" defaultValue={Number(bucket.amount)} disabled={!savingsBucketsResult.schemaReady} />
                  <Button type="submit" variant="secondary" className="w-full" disabled={!savingsBucketsResult.schemaReady}>
                    Vista heildarupphæð
                  </Button>
                </form>
              </details>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-5">
        <h2 className="mb-4 text-lg font-bold">Síðustu sparnaðarskráningar</h2>
        {savingsEntriesResult.schemaReady ? (
          savingsEntriesResult.entries.length ? (
            <div className="divide-y divide-line/10">
              {savingsEntriesResult.entries.slice(0, 8).map((entry) => (
                <div key={entry.id} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold">{entry.label}</p>
                    <p className="text-ink/55">
                      {entry.date}
                      {entry.note ? ` · ${entry.note}` : ""}
                    </p>
                  </div>
                  <p className="font-bold text-moss">{money(Number(entry.amount), currency)}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>Engar sparnaðarskráningar enn.</EmptyState>
          )
        ) : (
          <EmptyState>Keyrðu `supabase/savings-bucket-entries-update.sql` í Supabase til að virkja sparnaðarsögu.</EmptyState>
        )}
      </Card>

      <Card className="mb-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Húsnæðisparnaður</h2>
            <p className="text-sm text-ink/55">Samanlagt úr séreignarsparnaði og húsnæðissparnaði.</p>
          </div>
          <p className="text-3xl font-bold text-moss">{money(housingSavings, currency)}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {housingBuckets.map((bucket) => (
            <div key={bucket.bucket_type} className="rounded-lg border border-line/10 bg-surface/70 p-4">
              <p className="text-sm font-semibold text-ink/60">{bucket.label}</p>
              <p className="mt-2 text-xl font-bold">{money(Number(bucket.amount), currency)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Varasjóður</h2>
            <p className="text-sm text-ink/55">Samanlagt úr hlutabréfum og sjóðum.</p>
          </div>
          <p className="text-3xl font-bold text-moss">{money(emergencySavings, currency)}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {emergencyBuckets.map((bucket) => (
            <div key={bucket.bucket_type} className="rounded-lg border border-line/10 bg-surface/70 p-4">
              <p className="text-sm font-semibold text-ink/60">{bucket.label}</p>
              <p className="mt-2 text-xl font-bold">{money(Number(bucket.amount), currency)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-5">
        <div className="mb-4">
          <h2 className="text-lg font-bold">Heildarsparnaðarmarkmið</h2>
          <p className="text-sm text-ink/55">Settu eitt markmið fyrir heildarsparnaðinn. Framvindan tengist sjálfkrafa við upphæðina í Heildarsparnaði hér að ofan.</p>
        </div>

        {totalGoal ? (
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-lg border border-line/10 bg-surface/70 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">{totalGoal.title}</h3>
                  <p className="text-sm text-ink/55">{totalGoal.target_date ? `Markdagur ${totalGoal.target_date}` : "Enginn markdagur"}</p>
                </div>
                <form action={deleteSavingsGoal}>
                  <input type="hidden" name="id" value={totalGoal.id} />
                  <ConfirmButton
                    variant="danger"
                    className="h-9 w-9 p-0"
                    title="Eyða markmiði"
                    confirmMessage={`Ertu viss um að þú viljir eyða sparnaðarmarkmiðinu "${totalGoal.title}"?`}
                  >
                    <Trash2 size={16} />
                  </ConfirmButton>
                </form>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-ink/55">Núverandi sparnaður</p>
                  <p className="mt-1 text-xl font-bold">{money(totalSavings, currency)}</p>
                </div>
                <div>
                  <p className="text-sm text-ink/55">Markupphæð</p>
                  <p className="mt-1 text-xl font-bold">{money(Number(totalGoal.target_amount), currency)}</p>
                </div>
                <div>
                  <p className="text-sm text-ink/55">Eftir</p>
                  <p className="mt-1 text-xl font-bold">{money(remaining, currency)}</p>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex justify-between text-sm">
                  <span>Framvinda</span>
                  <span>{percent(progress)}</span>
                </div>
                <ProgressBar value={progress} />
              </div>
            </div>

            <div className="rounded-lg border border-line/10 bg-surface/70 p-5">
              <h3 className="font-bold">Breyta markmiði</h3>
              <form action={saveSavingsGoal} className="mt-4 grid gap-3">
                <input type="hidden" name="id" value={totalGoal.id} />
                <input type="hidden" name="current_amount" value={String(totalSavings)} />
                <input className={inputClass} name="title" defaultValue={totalGoal.title} placeholder="Titill markmiðs" required />
                <input className={inputClass} name="target_amount" type="number" min="0.01" step="0.01" defaultValue={Number(totalGoal.target_amount)} placeholder="Markupphæð" required />
                <input className={inputClass} name="target_date" type="date" defaultValue={totalGoal.target_date ?? ""} />
                <Button type="submit" variant="secondary">
                  Vista breytingar
                </Button>
              </form>
            </div>
          </div>
        ) : (
          <form action={saveSavingsGoal} className="grid gap-3 md:grid-cols-[1fr_170px_170px_auto]">
            <input className={inputClass} name="title" placeholder="Titill markmiðs" required />
            <input className={inputClass} name="target_amount" type="number" min="0.01" step="0.01" placeholder="Markupphæð" required />
            <input className={inputClass} name="target_date" type="date" />
            <input type="hidden" name="current_amount" value={String(totalSavings)} />
            <Button type="submit">
              <Plus size={17} />
              Vista markmið
            </Button>
          </form>
        )}
      </Card>

      {goals.length > 1 ? (
        <Card>
          <EmptyState>Það fundust fleiri en eitt sparnaðarmarkmið úr eldri uppsetningu. Nú er aðeins eitt heildarsparnaðarmarkmið notað hér.</EmptyState>
        </Card>
      ) : null}
    </>
  );
}
