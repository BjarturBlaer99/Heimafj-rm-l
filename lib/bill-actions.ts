"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthed } from "@/lib/data";
import { previousBillMonth } from "@/lib/bill-data";
import { isCalendarDate } from "@/lib/savings-plan";
import type { ActionFeedback } from "@/lib/action-feedback";
import type { Bill, Transaction } from "@/lib/types";

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const paymentSchema = z.object({ bill_id: z.string().uuid(), month: monthSchema, mode: z.enum(["existing", "new"]) });
const expenseChoiceSchema = z.object({ id: z.string().uuid(), amount: z.number().finite().positive(), date: z.string().refine(isCalendarDate) });
const newExpenseSchema = z.object({ amount: z.coerce.number().finite().positive().max(9_999_999_999.99), paid_at: z.string().refine(isCalendarDate) });

function failure(error: string): ActionFeedback { return { message: "", error }; }
function refreshBills() {
  revalidatePath("/", "layout");
}

export async function recordBillPayment(formData: FormData): Promise<ActionFeedback> {
  const { supabase, user } = await getAuthed();
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure("Veldu reikning, mánuð og skráningaraðferð.");
  const { bill_id, month, mode } = parsed.data;
  const { data: bill, error: billError } = await supabase.from("bills").select("*").eq("id", bill_id).eq("user_id", user.id).single();
  if (billError || !bill) return failure("Reikningurinn fannst ekki. Endurhlaðaðu síðuna.");
  if (bill.month !== `${month}-01` || !bill.is_active) return failure("Veldu virkan reikning í réttum mánuði.");
  const existingPayment = await supabase.from("bill_payments").select("id").eq("user_id", user.id).eq("bill_id", bill_id).eq("month", `${month}-01`).maybeSingle();
  if (existingPayment.error) return failure("Ekki tókst að athuga greiðslustöðu. Reyndu aftur.");
  if (existingPayment.data) return failure("Reikningurinn er þegar merktur greiddur. Endurhlaðaðu síðuna.");

  let transaction: Pick<Transaction, "id" | "amount" | "date">;
  let createdTransaction = false;
  if (mode === "existing") {
    let choice;
    try { choice = expenseChoiceSchema.safeParse(JSON.parse(String(formData.get("transaction") ?? ""))); }
    catch { return failure("Veldu skráða útgjaldafærslu."); }
    if (!choice.success) return failure("Veldu skráða útgjaldafærslu.");
    const expense = await supabase.from("transactions").select("id, amount, date, type").eq("id", choice.data.id).eq("user_id", user.id).single();
    if (expense.error || !expense.data || expense.data.type !== "expense") return failure("Útgjaldafærslan fannst ekki. Endurhlaðaðu síðuna.");
    if (Number(expense.data.amount) !== choice.data.amount || expense.data.date !== choice.data.date) return failure("Færslunni hefur verið breytt. Endurhlaðaðu síðuna og veldu hana aftur.");
    const links = await supabase.from("bill_payments").select("id").eq("user_id", user.id).eq("transaction_id", choice.data.id).limit(1);
    if (links.error) return failure("Ekki tókst að athuga tengingu færslunnar. Reyndu aftur.");
    if (links.data?.length) return failure("Færslan er þegar tengd reikningi. Hver færsla getur aðeins greitt einn reikning.");
    transaction = expense.data;
  } else {
    const input = newExpenseSchema.safeParse(Object.fromEntries(formData));
    if (!input.success) return failure("Skráðu gilda greiðsludagsetningu og upphæð yfir núlli.");
    if (formData.get("confirm_new_expense") !== "on") return failure("Staðfestu að greiðslan sé ekki þegar skráð í færslum.");
    const expense = await supabase.from("transactions").insert({ user_id: user.id, category_id: bill.category_id, amount: input.data.amount, type: "expense", date: input.data.paid_at, note: bill.name }).select("id, amount, date").single();
    if (expense.error || !expense.data) return failure("Ekki tókst að skrá útgjaldafærslu. Athugaðu færslur áður en þú reynir aftur.");
    transaction = expense.data;
    createdTransaction = true;
  }

  // A transaction's UUID is also its payment UUID. The existing PK serializes
  // concurrent linking attempts across bills without an additional migration.
  const payment = await supabase.from("bill_payments").insert({ id: transaction.id, user_id: user.id, bill_id, transaction_id: transaction.id, month: `${month}-01`, amount: Number(transaction.amount), paid_at: transaction.date });
  if (payment.error) {
    if (createdTransaction) {
      // Only our newly created, still-unlinked expense can be compensated.
      const links = await supabase.from("bill_payments").select("id").eq("user_id", user.id).eq("transaction_id", transaction.id).limit(1);
      if (!links.error && !links.data?.length) {
        const cleanup = await supabase.from("transactions").delete().eq("id", transaction.id).eq("user_id", user.id);
        if (cleanup.error) { refreshBills(); return failure("Útgjaldafærsla var skráð en greiðslutenging mistókst. Skoðaðu færslur og tengdu færsluna þaðan."); }
      } else { refreshBills(); return failure("Ekki tókst að staðfesta greiðslutenginguna. Skoðaðu reikninga og færslur áður en þú reynir aftur."); }
    }
    refreshBills();
    return failure(payment.error.code === "23505" ? "Reikningurinn eða færslan er þegar tengd greiðslu. Endurhlaðaðu síðuna." : "Ekki tókst að tengja greiðsluna. Athugaðu stöðuna áður en þú reynir aftur.");
  }
  const current = await supabase.from("transactions").select("amount, date, type").eq("user_id", user.id).eq("id", transaction.id).single();
  if (current.error || !current.data || current.data.type !== "expense" || Number(current.data.amount) !== Number(transaction.amount) || current.data.date !== transaction.date) {
    const rollback = await supabase.from("bill_payments").delete().eq("id", transaction.id).eq("user_id", user.id).eq("bill_id", bill_id);
    refreshBills();
    return failure(rollback.error ? "Greiðslutenging þarfnast yfirferðar. Endurhlaðaðu síðuna og athugaðu reikning og færslu." : "Færslan breyttist við tengingu. Hún var ekki merkt greidd; skoðaðu færsluna og reyndu aftur.");
  }
  refreshBills();
  return { message: createdTransaction ? "Greiðslan var skráð með valinni dagsetningu og nýrri útgjaldafærslu." : "Reikningurinn var tengdur skráðri útgjaldafærslu. Engin ný færsla var búin til." };
}

export async function unlinkBillPayment(formData: FormData): Promise<ActionFeedback> {
  const { supabase, user } = await getAuthed();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return failure("Greiðslan fannst ekki.");
  const { data, error } = await supabase.from("bill_payments").delete().eq("id", id.data).eq("user_id", user.id).select("id");
  if (error) return failure("Ekki tókst að aftengja greiðsluna. Reyndu aftur.");
  if (!data?.length) return failure("Greiðslutengingin fannst ekki. Endurhlaðaðu síðuna.");
  refreshBills();
  return { message: "Greiðslutengingin var fjarlægð. Útgjaldafærslan helst í færslum." };
}

export async function copyPreviousBills(formData: FormData): Promise<ActionFeedback> {
  const { supabase, user } = await getAuthed();
  const parsed = z.object({ month: monthSchema, ids: z.array(z.string().uuid()).min(1).max(200) }).safeParse({ month: formData.get("month"), ids: formData.getAll("bill_ids") });
  if (!parsed.success) return failure("Veldu að minnsta kosti einn reikning til að afrita (mest 200 í einu).");
  const previous = previousBillMonth(parsed.data.month);
  const ids = [...new Set(parsed.data.ids)];
  const { data, error } = await supabase.from("bills").select("*").eq("user_id", user.id).eq("month", `${previous}-01`).eq("is_active", true).in("id", ids);
  if (error || !data || data.length !== ids.length) return failure("Valdir reikningar fundust ekki í fyrri mánuði. Endurhlaðaðu síðuna.");
  const copies = (data as Bill[]).map(({ series_id, category_id, name, amount, due_day }) => ({ user_id: user.id, series_id, category_id, month: `${parsed.data.month}-01`, name, amount, due_day, is_active: true }));
  const saved = await supabase.from("bills").upsert(copies, { onConflict: "user_id,series_id,month", ignoreDuplicates: true }).select("id");
  if (saved.error) return failure("Ekki tókst að afrita reikningana. Endurhlaðaðu síðuna áður en þú reynir aftur.");
  refreshBills();
  const count = saved.data?.length ?? 0;
  return { message: count ? `${count} reikningar afritaðir. Reikningum sem voru þegar til var sleppt.` : "Valdir reikningar eru þegar til í mánuðinum. Engum afritum var bætt við.", redirectTo: `/bills?month=${parsed.data.month}` };
}
