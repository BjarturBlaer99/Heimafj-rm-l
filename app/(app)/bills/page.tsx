import { ActionForm } from "@/components/action-form";
import { ArrowCounterClockwiseIcon as RotateCcw } from "@phosphor-icons/react/dist/ssr/ArrowCounterClockwise";
import { CheckCircleIcon as CheckCircle2 } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { PlusIcon as Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { TrashIcon as Trash2 } from "@phosphor-icons/react/dist/ssr/Trash";
import { ConfirmButton } from "@/components/confirm-button";
import { FlashMessage } from "@/components/flash-message";
import { Button, Card, DateInput, EmptyState, Field, MetricCard, PageHeader, SectionHeader, inputClass } from "@/components/ui";
import { deleteBill, saveBill } from "@/lib/actions";
import { copyPreviousBills, recordBillPayment, unlinkBillPayment } from "@/lib/bill-actions";
import { getBillPaymentCandidates, getCopyableBills, isBillMonth } from "@/lib/bill-data";
import { getBillsForMonth, getCategories } from "@/lib/data";
import { currentMonth, isoDate, money } from "@/lib/format";
import styles from "./bills.module.css";

function monthLabel(month: string) {
  const date = new Date(`${month}-01T00:00:00`);
  return new Intl.DateTimeFormat("is-IS", { month: "long", year: "numeric" }).format(date);
}

export default async function BillsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const month = params.month && isBillMonth(params.month) ? params.month : currentMonth();
  const expenseMonth = params.expense_month && isBillMonth(params.expense_month) ? params.expense_month : month;
  const [categories, billsResult, candidates, copyable] = await Promise.all([getCategories(), getBillsForMonth(month), getBillPaymentCandidates(expenseMonth), getCopyableBills(month)]);
  const currency = "ISK";
  const expenseCategories = categories.filter((category) => category.type !== "income");
  const activeBills = billsResult.bills.filter((bill) => bill.is_active);
  const paidBills = activeBills.filter((bill) => bill.payment);
  const unpaidBills = activeBills.filter((bill) => !bill.payment);
  const paidTotal = paidBills.reduce((sum, bill) => sum + Number(bill.payment?.amount ?? 0), 0);
  const unpaidTotal = unpaidBills.reduce((sum, bill) => sum + Number(bill.amount), 0);
  const orderedBills = [...billsResult.bills].sort((a, b) => {
    const rank = (bill: typeof a) => !bill.is_active ? 2 : bill.payment ? 1 : 0;
    return rank(a) - rank(b) || a.due_day - b.due_day;
  });

  return (
    <div className={styles.page}>
      <PageHeader title="Reikningar" description="Greiðslur mánaðarins, á einum stað." action={billsResult.schemaReady ? <a href="#new-bill" className={styles.primaryLink}><Plus size={17} /> Nýr reikningur</a> : undefined} />
      <FlashMessage code={params.success} />

      {!billsResult.schemaReady ? (
        <Card><EmptyState>Reikningar eru ekki tiltækir sem stendur. <a className="text-accent underline" href={`/bills?month=${month}`}>Reyna aftur</a></EmptyState></Card>
      ) : (
        <>
          <div className={styles.metrics}>
            <MetricCard label="Ógreitt" value={money(unpaidTotal, currency)} detail={`${unpaidBills.length} reikningar bíða greiðslu`} />
            <MetricCard label="Greitt" value={money(paidTotal, currency)} detail={`${paidBills.length} reikningar greiddir`} />
            <MetricCard label="Framvinda mánaðarins" value={`${paidBills.length} af ${activeBills.length}`} detail="Virkir reikningar greiddir" />
          </div>

          <div data-scroll-reveal="" className={styles.periodBar}>
            <div><p className={styles.eyebrow}>Tímabil</p><p className={styles.periodTitle}>{monthLabel(month)}</p></div>
            <form className={styles.periodForm}>
              <Field label="Mánuður"><DateInput name="month" type="month" defaultValue={month} /></Field>
              <Button type="submit" variant="secondary">Skoða mánuð</Button>
            </form>
          </div>

          <section className={styles.matchingPeriod} data-scroll-reveal aria-labelledby="matching-heading">
            <div><h2 id="matching-heading">Tengja skráðar greiðslur</h2><p>Veldu mánuð útgjaldafærslna sem þú vilt tengja við reikninga. Upphæð og greiðsludagur fylgja færslunni.</p></div>
            <form className={styles.periodForm}>
              <input type="hidden" name="month" value={month} />
              <Field label="Mánuður útgjaldafærslna"><DateInput type="month" name="expense_month" defaultValue={expenseMonth} /></Field>
              <Button type="submit" variant="secondary">Sýna færslur</Button>
            </form>
          </section>
          {!candidates.ready ? <Card className="mb-5"><EmptyState>Ekki tókst að sækja skráðar útgjaldafærslur. <a className="text-accent underline" href={`/bills?month=${month}&expense_month=${expenseMonth}`}>Reyna aftur</a></EmptyState></Card> : null}

          <div className={styles.layout}>
            <section className={styles.ledger} aria-labelledby="bills-heading">
              <div data-scroll-reveal="" className={styles.ledgerHeader}><div><h2 id="bills-heading">Reikningar mánaðarins</h2><p>Ógreiddir reikningar fyrst, í röð eftir gjalddaga.</p></div><span className={styles.count}>{billsResult.bills.length}</span></div>
              {orderedBills.length ? orderedBills.map((bill) => (
                <article key={bill.id} className={styles.bill} data-inactive={!bill.is_active || undefined} data-scroll-reveal>
                  <div className={styles.billSummary}>
                    <div className={styles.dueDay} aria-label={`Gjalddagi ${bill.due_day}. í mánuðinum`}><span>dagur</span><strong>{bill.due_day}</strong></div>
                    <div className={styles.billName}><h3>{bill.name}</h3><p>{bill.categories?.name ?? "Óflokkað"}</p></div>
                    <span className={styles.status} data-paid={Boolean(bill.payment)} data-inactive={!bill.is_active || undefined}>{!bill.is_active ? "Óvirkur" : bill.payment ? <><CheckCircle2 size={14} /> Greitt</> : "Ógreitt"}</span>
                    <p className={styles.amount}>{money(Number(bill.payment?.amount ?? bill.amount), currency)}</p>
                  </div>

                  <div className={styles.billActions}>
                    {bill.payment ? (
                      <div className={styles.paymentReceipt}>
                        <p>Greiðsludagur: {bill.payment.paid_at}. Útgjaldafærslan helst þótt greiðslutengingin sé fjarlægð.</p>
                      <ActionForm action={unlinkBillPayment}>
                        <input type="hidden" name="id" value={bill.payment.id} />
                        <Button variant="secondary" className={styles.quietButton}><RotateCcw size={15} /> Aftengja greiðslu</Button>
                      </ActionForm>
                      </div>
                    ) : bill.is_active ? (
                      <section className={styles.formSection}>
                        <h4>Tengja útgjaldafærslu</h4>
                        {candidates.ready && candidates.expenses.length ? <ActionForm action={recordBillPayment} className={styles.existingPaymentForm}>
                          <input type="hidden" name="bill_id" value={bill.id} />
                          <input type="hidden" name="month" value={month} />
                          <input type="hidden" name="mode" value="existing" />
                          <Field label={`Ótengdar útgjaldafærslur í ${monthLabel(expenseMonth)}`}><select className={inputClass} name="transaction" defaultValue="" required><option value="" disabled>Veldu greiðsluna úr færslum</option>{candidates.expenses.map((expense) => <option key={expense.id} value={JSON.stringify({ id: expense.id, amount: Number(expense.amount), date: expense.date })}>{expense.date} · {expense.note || "Útgjöld"} · {money(Number(expense.amount), currency)}</option>)}</select></Field>
                          <Button type="submit" variant="secondary">Tengja færslu</Button>
                        </ActionForm> : <p className={styles.formNote}>{candidates.ready ? "Engar ótengdar útgjaldafærslur í völdum mánuði. Veldu annan mánuð hér fyrir ofan eða skráðu nýja greiðslu hér að neðan." : "Ekki tókst að sækja útgjaldafærslur. Endurhlaðaðu síðuna áður en þú skráir greiðslu."}</p>}
                        <div className={styles.newPaymentHeading}><h4>Skrá nýja greiðslu</h4><p>Notaðu aðeins ef greiðslan hefur ekki verið skráð eða flutt inn áður.</p></div>
                        <ActionForm action={recordBillPayment} className={styles.paymentForm}>
                          <input type="hidden" name="bill_id" value={bill.id} />
                          <input type="hidden" name="month" value={month} />
                          <input type="hidden" name="mode" value="new" />
                          <Field label="Greidd upphæð"><input className={inputClass} name="amount" type="number" min="0.01" step="0.01" defaultValue={Number(bill.amount)} required /></Field>
                          <Field label="Raunverulegur greiðsludagur"><DateInput name="paid_at" defaultValue={isoDate()} required /></Field>
                          <label className={`${styles.checkbox} ${styles.confirmExpense}`}><input type="checkbox" name="confirm_new_expense" required /> Greiðslan er ekki þegar skráð í færslum.</label>
                          <Button type="submit"><CheckCircle2 size={16} /> Búa til útgjaldafærslu og merkja greitt</Button>
                        </ActionForm>
                      </section>
                    ) : null}

                    <section className={styles.formSection}>
                      <h4>Breyta reikningi</h4>
                      <ActionForm action={saveBill} className={styles.editForm}>
                        <input type="hidden" name="id" value={bill.id} />
                        <input type="hidden" name="month" value={month} />
                        <Field label="Heiti reiknings"><input className={inputClass} name="name" defaultValue={bill.name} required /></Field>
                        <Field label="Upphæð"><input className={inputClass} name="amount" type="number" min="0.01" step="0.01" defaultValue={Number(bill.amount)} required /></Field>
                        <Field label="Gjalddagi í mánuði"><input className={inputClass} name="due_day" type="number" min="1" max="31" defaultValue={bill.due_day} required /></Field>
                        <Field label="Flokkur"><select className={inputClass} name="category_id" defaultValue={bill.category_id ?? ""}><option value="">Óflokkað</option>{expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
                        <label className={styles.checkbox}><input name="is_active" type="checkbox" defaultChecked={bill.is_active} /> Virkur</label>
                        <Button type="submit" variant="secondary">Vista breytingar</Button>
                      </ActionForm>
                      <div className={styles.deleteActions}>
                        <ActionForm action={deleteBill}>
                          <input type="hidden" name="id" value={bill.id} /><input type="hidden" name="month" value={month} /><input type="hidden" name="scope" value="month" />
                          <ConfirmButton variant="secondary" confirmMessage={`Eyða reikningnum "${bill.name}" aðeins úr ${monthLabel(month)}? Greidd útgjaldafærsla helst áfram í færslum.`}><Trash2 size={16} /> Eyða úr þessum mánuði</ConfirmButton>
                        </ActionForm>
                        <ActionForm action={deleteBill}>
                          <input type="hidden" name="id" value={bill.id} /><input type="hidden" name="month" value={month} /><input type="hidden" name="scope" value="all" />
                          <ConfirmButton variant="danger" confirmMessage={`Eyða reikningnum "${bill.name}" úr öllum mánuðum? Þessa aðgerð er ekki hægt að afturkalla. Greiddar útgjaldafærslur haldast áfram í færslum.`}><Trash2 size={16} /> Eyða úr öllum mánuðum</ConfirmButton>
                        </ActionForm>
                      </div>
                    </section>
                  </div>
                </article>
              )) : <div className={styles.empty}><EmptyState>Engir reikningar skráðir í þessum mánuði. Bættu við fyrsta reikningnum til að fylgjast með greiðslustöðunni.</EmptyState></div>}
              <div className={styles.ledgerFooter}>Reikningar eru skráðir fyrir einn mánuð í einu og færast ekki sjálfkrafa á milli mánaða.</div>
            </section>

            <div className={styles.sidebar}>
            <aside className={styles.newBill} id="new-bill" data-scroll-reveal>
              <SectionHeader title="Nýr reikningur" description={`Skráður í ${monthLabel(month)}.`} />
              <ActionForm resetOnSuccess action={saveBill} className={styles.newForm}>
                <input type="hidden" name="month" value={month} />
                <Field label="Heiti reiknings"><input className={inputClass} name="name" placeholder="T.d. rafmagn" required /></Field>
                <div className={styles.amountAndDate}>
                  <Field label="Upphæð"><input className={inputClass} name="amount" type="number" min="0.01" step="0.01" placeholder="0" required /></Field>
                  <Field label="Gjalddagi (dagur)"><input className={inputClass} name="due_day" type="number" min="1" max="31" defaultValue={1} required /></Field>
                </div>
                <Field label="Flokkur"><select className={inputClass} name="category_id"><option value="">Óflokkað</option>{expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
                <label className={styles.checkbox}><input name="is_active" type="checkbox" defaultChecked /> Virkur reikningur</label>
                <Button type="submit"><Plus size={17} /> Bæta við</Button>
              </ActionForm>
              <p className={styles.formNote}>Tengdu skráða útgjaldafærslu við reikninginn eða veldu sérstaklega að búa til nýja greiðslu.</p>
            </aside>
            <section className={styles.newBill} data-scroll-reveal aria-labelledby="copy-bills-heading">
              <h2 id="copy-bills-heading">Afrita fyrri mánuð</h2>
              <p className={styles.formNote}>Veldu reikninga úr {monthLabel(copyable.previous)}. Upphæðir og gjalddagar afritast; greiðslustaða afritast ekki.</p>
              {copyable.ready && copyable.bills.length ? <ActionForm action={copyPreviousBills} className={styles.copyForm}>
                <input type="hidden" name="month" value={month} />
                {copyable.bills.map((bill) => <label key={bill.id} className={styles.copyChoice}><input type="checkbox" name="bill_ids" value={bill.id} /><span>{bill.name}<small>{money(Number(bill.amount), currency)} · gjalddagi {bill.due_day}.</small></span></label>)}
                <Button type="submit" variant="secondary">Afrita valda reikninga</Button>
              </ActionForm> : <p className={styles.formNote}>{copyable.ready ? "Engir fleiri virkir reikningar úr fyrri mánuði til að afrita." : <>Ekki tókst að sækja fyrri mánuð. <a className="text-accent underline" href={`/bills?month=${month}&expense_month=${expenseMonth}`}>Reyna aftur</a></>}</p>}
            </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
