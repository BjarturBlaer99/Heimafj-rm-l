import { getAuthed } from "@/lib/data";
import type { Bill, Transaction } from "@/lib/types";

export function isBillMonth(month: string) { return /^\d{4}-(0[1-9]|1[0-2])$/.test(month); }

export function previousBillMonth(month: string) {
  if (!isBillMonth(month)) throw new Error("Ógildur mánuður.");
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 7);
}

export async function getCopyableBills(month: string) {
  const { supabase, user } = await getAuthed();
  const previous = previousBillMonth(month);
  const [source, destination] = await Promise.all([
    supabase.from("bills").select("*").eq("user_id", user.id).eq("month", `${previous}-01`).eq("is_active", true).order("due_day").order("name"),
    supabase.from("bills").select("series_id").eq("user_id", user.id).eq("month", `${month}-01`)
  ]);
  if (source.error || destination.error) return { ready: false, previous, bills: [] as Bill[] };
  const existing = new Set((destination.data ?? []).map((bill) => bill.series_id));
  return { ready: true, previous, bills: ((source.data ?? []) as Bill[]).filter((bill) => !existing.has(bill.series_id)) };
}

/** The visible month is explicit; every unlinked expense in that month is included. */
export async function getBillPaymentCandidates(month: string) {
  const { supabase, user } = await getAuthed();
  const end = new Date(`${month}-01T12:00:00Z`);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const expenses: Transaction[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("transactions").select("*").eq("user_id", user.id).eq("type", "expense")
      .gte("date", `${month}-01`).lt("date", end.toISOString().slice(0, 10))
      .order("date", { ascending: false }).order("id").range(offset, offset + 499);
    if (error) return { ready: false, expenses: [] as Transaction[] };
    const rows = (data ?? []) as Transaction[];
    expenses.push(...rows);
    if (rows.length < 500) break;
  }
  const linked = new Set<string>();
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("bill_payments").select("transaction_id").eq("user_id", user.id).order("id").range(offset, offset + 499);
    if (error) return { ready: false, expenses: [] as Transaction[] };
    for (const payment of data ?? []) if (payment.transaction_id) linked.add(payment.transaction_id);
    if ((data ?? []).length < 500) break;
  }
  return { ready: true, expenses: expenses.filter((expense) => !linked.has(expense.id)) };
}
