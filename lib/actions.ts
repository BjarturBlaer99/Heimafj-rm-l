"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { billPaymentSchema, billSchema, budgetSchema, categorySchema, importTransactionsSchema, monthlyIncomeSchema, profileSchema, savingsBucketEntrySchema, savingsBucketSchema, savingsContributionSchema, savingsGoalSchema, transactionSchema } from "@/lib/validation";

async function userId() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, userId: data.user.id };
}

function formDataObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function firstMonthFromRows(rows: Array<{ date: string }>) {
  return rows[0]?.date.slice(0, 7) ?? "";
}

function transactionImportKey(row: { date: string; type: string; amount: number; note?: string | null }) {
  const note = (row.note ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  return `${row.date}|${row.type}|${Number(row.amount).toFixed(2)}|${note}`;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function saveTransaction(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const data = transactionSchema.parse(formDataObject(formData));
  const payload = { ...data, user_id: id, note: data.note || null, category_id: data.category_id || null };
  const result = data.id
    ? await supabase.from("transactions").update(payload).eq("id", data.id).eq("user_id", id)
    : await supabase.from("transactions").insert(payload);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

export async function deleteTransaction(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const result = await supabase.from("transactions").delete().eq("id", String(formData.get("id"))).eq("user_id", id);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

export async function deleteAllTransactions() {
  const { supabase, userId: id } = await userId();
  const result = await supabase.from("transactions").delete().eq("user_id", id);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

export async function importTransactions(formData: FormData) {
  const result = await importTransactionsForClient(formData);
  redirect(result.redirectTo);
}

export async function importTransactionsForClient(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const rawRows = String(formData.get("rows") ?? "[]");
  const rows = importTransactionsSchema.parse(JSON.parse(rawRows));
  const dates = rows.map((row) => row.date).sort();
  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];
  const existingKeys = new Set<string>();

  if (firstDate && lastDate) {
    const { data, error } = await supabase
      .from("transactions")
      .select("date,type,amount,note")
      .eq("user_id", id)
      .gte("date", firstDate)
      .lte("date", lastDate);
    if (error) throw new Error(error.message);
    (data ?? []).forEach((row) => {
      existingKeys.add(transactionImportKey(row));
    });
  }

  const fileKeys = new Set<string>();
  const uniqueRows = rows.filter((row) => {
    const key = transactionImportKey(row);
    if (existingKeys.has(key) || fileKeys.has(key)) return false;
    fileKeys.add(key);
    return true;
  });
  const skipped = rows.length - uniqueRows.length;
  const payload = uniqueRows.map((row) => ({
    ...row,
    user_id: id,
    note: row.note || null,
    category_id: row.category_id || null
  }));
  for (let index = 0; index < payload.length; index += 100) {
    const result = await supabase.from("transactions").insert(payload.slice(index, index + 100));
    if (result.error) throw new Error(result.error.message);
  }
  revalidatePath("/import");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/analytics");
  const importedMonth = firstMonthFromRows(rows);
  const params = new URLSearchParams({
    success: payload.length > 0 ? (skipped > 0 ? "imported_partial" : "imported") : "imported_duplicates",
    imported: String(payload.length),
    skipped: String(skipped)
  });
  if (importedMonth) params.set("month", importedMonth);
  return { redirectTo: `/transactions?${params.toString()}` };
}

export async function saveCategory(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const data = categorySchema.parse(formDataObject(formData));
  const payload = { name: data.name, type: data.type, user_id: id, is_default: false };
  const result = data.id
    ? await supabase.from("categories").update(payload).eq("id", data.id).eq("user_id", id)
    : await supabase.from("categories").insert(payload);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/settings");
}

export async function deleteCategory(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const result = await supabase.from("categories").delete().eq("id", String(formData.get("id"))).eq("user_id", id).eq("is_default", false);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/settings");
}

export async function saveBudget(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const data = budgetSchema.parse(formDataObject(formData));
  const payload = { ...data, user_id: id, category_id: data.category_id || null };
  const result = data.id
    ? await supabase.from("budgets").update(payload).eq("id", data.id).eq("user_id", id)
    : await supabase.from("budgets").insert(payload);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/budgets");
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

export async function deleteBudget(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const result = await supabase.from("budgets").delete().eq("id", String(formData.get("id"))).eq("user_id", id);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/budgets");
  revalidatePath("/expenses");
}

export async function saveBill(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const data = billSchema.parse(formDataObject(formData));
  const payload = {
    user_id: id,
    name: data.name,
    amount: data.amount,
    due_day: data.due_day,
    category_id: data.category_id || null,
    is_active: data.is_active
  };
  const result = data.id
    ? await supabase.from("bills").update(payload).eq("id", data.id).eq("user_id", id)
    : await supabase.from("bills").insert(payload);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/bills");
}

export async function deleteBill(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const result = await supabase.from("bills").delete().eq("id", String(formData.get("id"))).eq("user_id", id);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/bills");
}

export async function markBillPaid(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const data = billPaymentSchema.parse(formDataObject(formData));
  const { data: bill, error: billError } = await supabase
    .from("bills")
    .select("id, name, category_id, due_day")
    .eq("id", data.bill_id)
    .eq("user_id", id)
    .single();
  if (billError) throw new Error(billError.message);

  const [year, month] = data.month.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const paidDate = `${data.month}-${String(Math.min(Number(bill.due_day), lastDay)).padStart(2, "0")}`;
  const transactionResult = await supabase
    .from("transactions")
    .insert({
      user_id: id,
      category_id: bill.category_id,
      amount: data.amount,
      type: "expense",
      date: paidDate,
      note: bill.name
    })
    .select("id")
    .single();
  if (transactionResult.error) throw new Error(transactionResult.error.message);

  const paymentResult = await supabase.from("bill_payments").insert({
    user_id: id,
    bill_id: data.bill_id,
    transaction_id: transactionResult.data.id,
    month: `${data.month}-01`,
    amount: data.amount,
    paid_at: paidDate
  });
  if (paymentResult.error) {
    await supabase.from("transactions").delete().eq("id", transactionResult.data.id).eq("user_id", id);
    throw new Error(paymentResult.error.message);
  }
  revalidatePath("/bills");
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/transactions");
  revalidatePath("/analytics");
  redirect(`/bills?month=${data.month}&success=bill_paid`);
}

export async function deleteBillPayment(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const { data: payment, error } = await supabase
    .from("bill_payments")
    .select("id, transaction_id")
    .eq("id", String(formData.get("id")))
    .eq("user_id", id)
    .single();
  if (error) throw new Error(error.message);
  if (payment.transaction_id) {
    const transactionResult = await supabase.from("transactions").delete().eq("id", payment.transaction_id).eq("user_id", id);
    if (transactionResult.error) throw new Error(transactionResult.error.message);
  }
  const paymentResult = await supabase.from("bill_payments").delete().eq("id", payment.id).eq("user_id", id);
  if (paymentResult.error) throw new Error(paymentResult.error.message);
  revalidatePath("/bills");
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/transactions");
  revalidatePath("/analytics");
}

export async function saveMonthlyIncome(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const data = monthlyIncomeSchema.parse(formDataObject(formData));
  const payload = {
    user_id: id,
    category_id: data.category_id || null,
    amount: data.amount,
    type: "income" as const,
    date: data.month,
    note: data.note || null
  };
  const result = data.id
    ? await supabase.from("transactions").update(payload).eq("id", data.id).eq("user_id", id)
    : await supabase.from("transactions").insert(payload);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/income");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
}

export async function deleteMonthlyIncome(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const result = await supabase.from("transactions").delete().eq("id", String(formData.get("id"))).eq("user_id", id).eq("type", "income");
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/income");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
}

export async function saveSavingsGoal(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const data = savingsGoalSchema.parse(formDataObject(formData));
  const payload = { ...data, user_id: id, target_date: data.target_date || null };
  const result = data.id
    ? await supabase.from("savings_goals").update(payload).eq("id", data.id).eq("user_id", id)
    : await supabase.from("savings_goals").insert(payload);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/savings-goals");
  revalidatePath("/dashboard");
}

export async function deleteSavingsGoal(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const result = await supabase.from("savings_goals").delete().eq("id", String(formData.get("id"))).eq("user_id", id);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/savings-goals");
}

export async function addSavingsContribution(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const data = savingsContributionSchema.parse(formDataObject(formData));
  const result = await supabase.from("savings_contributions").insert({ ...data, user_id: id, note: data.note || null });
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/savings-goals");
  revalidatePath("/dashboard");
}

export async function deleteSavingsContribution(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const result = await supabase.from("savings_contributions").delete().eq("id", String(formData.get("id"))).eq("user_id", id);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/savings-goals");
  revalidatePath("/dashboard");
}

export async function deleteAllSavingsContributions() {
  const { supabase, userId: id } = await userId();
  const result = await supabase.from("savings_contributions").delete().eq("user_id", id);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/savings-goals");
  revalidatePath("/dashboard");
}

export async function saveSavingsBucket(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const data = savingsBucketSchema.parse(formDataObject(formData));
  const result = await supabase.from("savings_buckets").upsert(
    {
      user_id: id,
      bucket_type: data.bucket_type,
      label: data.label,
      amount: data.amount
    },
    { onConflict: "user_id,bucket_type" }
  );
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/savings-goals");
  revalidatePath("/dashboard");
}

export async function addSavingsBucketAmount(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const data = savingsBucketEntrySchema.parse(formDataObject(formData));
  const { data: currentBucket, error: currentError } = await supabase
    .from("savings_buckets")
    .select("amount")
    .eq("user_id", id)
    .eq("bucket_type", data.bucket_type)
    .maybeSingle();
  if (currentError) throw new Error(currentError.message);

  const nextAmount = Number(currentBucket?.amount ?? 0) + data.amount;
  const bucketResult = await supabase.from("savings_buckets").upsert(
    {
      user_id: id,
      bucket_type: data.bucket_type,
      label: data.label,
      amount: nextAmount
    },
    { onConflict: "user_id,bucket_type" }
  );
  if (bucketResult.error) throw new Error(bucketResult.error.message);

  const entryResult = await supabase.from("savings_bucket_entries").insert({
    user_id: id,
    bucket_type: data.bucket_type,
    label: data.label,
    amount: data.amount,
    date: data.date,
    note: data.note || null
  });
  if (entryResult.error) throw new Error(entryResult.error.message);
  revalidatePath("/savings-goals");
  revalidatePath("/dashboard");
  revalidatePath("/monthly-overview");
  redirect("/savings-goals?success=savings_added");
}

export async function deleteSavingsBucket(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const result = await supabase
    .from("savings_buckets")
    .delete()
    .eq("user_id", id)
    .eq("bucket_type", String(formData.get("bucket_type")));
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/savings-goals");
  revalidatePath("/dashboard");
}

export async function saveProfile(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const data = profileSchema.parse(formDataObject(formData));
  const result = await supabase.from("profiles").update(data).eq("id", id);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/settings");
}
