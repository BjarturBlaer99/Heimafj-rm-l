import { ArrowCounterClockwiseIcon as RotateCcw } from "@phosphor-icons/react/dist/ssr/ArrowCounterClockwise";
import { CheckCircleIcon as CheckCircle2 } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { CircleIcon as Circle } from "@phosphor-icons/react/dist/ssr/Circle";
import { PlusIcon as Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { TrashIcon as Trash2 } from "@phosphor-icons/react/dist/ssr/Trash";
import { ConfirmButton } from "@/components/confirm-button";
import { FlashMessage } from "@/components/flash-message";
import { Button, Card, EmptyState, Field, PageHeader, inputClass } from "@/components/ui";
import { deleteBill, deleteBillPayment, markBillPaid, saveBill } from "@/lib/actions";
import { getBillsForMonth, getCategories } from "@/lib/data";
import { currentMonth, money } from "@/lib/format";

function monthLabel(month: string) {
  const date = new Date(`${month}-01T00:00:00`);
  return new Intl.DateTimeFormat("is-IS", { month: "long", year: "numeric" }).format(date);
}

export default async function BillsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const month = params.month ?? currentMonth();
  const [categories, billsResult] = await Promise.all([getCategories(), getBillsForMonth(month)]);
  const currency = "ISK";
  const expenseCategories = categories.filter((category) => category.type !== "income");
  const activeBills = billsResult.bills.filter((bill) => bill.is_active);
  const paidBills = activeBills.filter((bill) => bill.payment);
  const unpaidBills = activeBills.filter((bill) => !bill.payment);
  const paidTotal = paidBills.reduce((sum, bill) => sum + Number(bill.payment?.amount ?? 0), 0);
  const unpaidTotal = unpaidBills.reduce((sum, bill) => sum + Number(bill.amount), 0);

  return (
    <>
      <PageHeader title="Reikningar" />
      <FlashMessage code={params.success} />

      {!billsResult.schemaReady ? (
        <Card>
          <EmptyState>Keyrðu `supabase/bills-update.sql` í Supabase til að virkja reikninga.</EmptyState>
        </Card>
      ) : (
        <>
          <div className="mb-5 grid gap-4 md:grid-cols-3">
            <Card>
              <p className="text-sm font-semibold text-ink/55">Greitt í {monthLabel(month)}</p>
              <p className="mt-3 text-2xl font-bold text-moss">{money(paidTotal, currency)}</p>
            </Card>
            <Card>
              <p className="text-sm font-semibold text-ink/55">Ógreitt</p>
              <p className="mt-3 text-2xl font-bold text-coral">{money(unpaidTotal, currency)}</p>
            </Card>
            <Card>
              <p className="text-sm font-semibold text-ink/55">Staða reikninga</p>
              <p className="mt-3 text-2xl font-bold">
                {paidBills.length}/{activeBills.length}
              </p>
            </Card>
          </div>

          <Card className="mb-5">
            <form className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Field label="Mánuður">
                <input className={inputClass} name="month" type="month" defaultValue={month} />
              </Field>
              <div className="flex items-end">
                <Button type="submit" variant="secondary">
                  Skoða mánuð
                </Button>
              </div>
            </form>
          </Card>

          <Card className="mb-5">
            <div className="mb-4">
              <h2 className="font-bold">Nýr reikningur</h2>
              <p className="text-sm text-ink/55">Þegar reikningur er merktur greiddur verður hann að útgjaldafærslu í völdum mánuði.</p>
            </div>
            <form action={saveBill} className="grid gap-3 md:grid-cols-[1fr_150px_120px_1fr_auto]">
              <input className={inputClass} name="name" placeholder="Heiti reiknings" required />
              <input className={inputClass} name="amount" type="number" min="0.01" step="0.01" placeholder="Upphæð" required />
              <input className={inputClass} name="due_day" type="number" min="1" max="31" defaultValue={1} required />
              <select className={inputClass} name="category_id">
                <option value="">Óflokkað</option>
                {expenseCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <label className="flex h-10 items-center gap-2 text-sm font-semibold text-ink/70">
                <input name="is_active" type="checkbox" defaultChecked />
                Virkur
              </label>
              <div className="md:col-span-5">
                <Button type="submit">
                  <Plus size={17} />
                  Bæta við
                </Button>
              </div>
            </form>
          </Card>

          <div className="grid gap-4">
            {billsResult.bills.length ? (
              billsResult.bills.map((bill) => (
                <Card key={bill.id} className={!bill.is_active ? "opacity-65" : undefined}>
                  <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {bill.payment ? <CheckCircle2 className="text-moss" size={20} /> : <Circle className="text-ink/35" size={20} />}
                        <h2 className="font-bold">{bill.name}</h2>
                        {!bill.is_active ? <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-ink/55">Óvirkur</span> : null}
                      </div>
                      <p className="mt-1 text-sm text-ink/55">
                        Gjalddagi {bill.due_day}. hvers mánaðar · {bill.categories?.name ?? "Óflokkað"}
                      </p>
                    </div>

                    <div className="grid gap-2 text-left lg:min-w-[280px] lg:text-right">
                      <p className="text-xl font-bold">{money(Number(bill.payment?.amount ?? bill.amount), currency)}</p>
                      {bill.payment ? (
                        <form action={deleteBillPayment}>
                          <input type="hidden" name="id" value={bill.payment.id} />
                          <Button variant="secondary" className="w-full lg:w-auto">
                            <RotateCcw size={16} />
                            Afturkalla greiðslu
                          </Button>
                        </form>
                      ) : bill.is_active ? (
                        <form action={markBillPaid} className="grid gap-2 sm:grid-cols-[1fr_auto] lg:grid-cols-[1fr_auto]">
                          <input type="hidden" name="bill_id" value={bill.id} />
                          <input type="hidden" name="month" value={month} />
                          <input className={inputClass} name="amount" type="number" min="0.01" step="0.01" defaultValue={Number(bill.amount)} required />
                          <Button type="submit">
                            <CheckCircle2 size={16} />
                            Merkja greitt
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </div>

                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-semibold text-moss">Breyta reikningi</summary>
                    <form action={saveBill} className="mt-3 grid gap-3 md:grid-cols-[1fr_150px_120px_1fr_auto]">
                      <input type="hidden" name="id" value={bill.id} />
                      <input className={inputClass} name="name" defaultValue={bill.name} required />
                      <input className={inputClass} name="amount" type="number" min="0.01" step="0.01" defaultValue={Number(bill.amount)} required />
                      <input className={inputClass} name="due_day" type="number" min="1" max="31" defaultValue={bill.due_day} required />
                      <select className={inputClass} name="category_id" defaultValue={bill.category_id ?? ""}>
                        <option value="">Óflokkað</option>
                        {expenseCategories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      <label className="flex h-10 items-center gap-2 text-sm font-semibold text-ink/70">
                        <input name="is_active" type="checkbox" defaultChecked={bill.is_active} />
                        Virkur
                      </label>
                      <div className="flex flex-wrap gap-2 md:col-span-5">
                        <Button type="submit" variant="secondary">
                          Vista breytingar
                        </Button>
                      </div>
                    </form>
                    <form action={deleteBill} className="mt-2">
                      <input type="hidden" name="id" value={bill.id} />
                      <ConfirmButton variant="danger" confirmMessage={`Ertu viss um að þú viljir eyða reikningnum "${bill.name}"?`}>
                        <Trash2 size={16} />
                        Eyða reikningi
                      </ConfirmButton>
                    </form>
                  </details>
                </Card>
              ))
            ) : (
              <EmptyState>Engir reikningar skráðir enn. Bættu við fyrsta reikningnum hér að ofan og merktu hann svo greiddan fyrir mánuðinn.</EmptyState>
            )}
          </div>
        </>
      )}
    </>
  );
}
