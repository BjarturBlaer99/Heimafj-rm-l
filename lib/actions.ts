"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionFeedback } from "@/lib/action-feedback";
import { createClient } from "@/lib/supabase/server";
import { billDeleteSchema, billSchema, budgetSchema, categorySchema, monthlyIncomeSchema, profileSchema, savingsBucketEntrySchema, savingsBucketSchema, savingsContributionSchema, savingsGoalSchema, transactionSchema } from "@/lib/validation";

async function userId() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, userId: data.user.id };
}

function formDataObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function saveTransaction(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const data = transactionSchema.parse(formDataObject(formData));
  if (data.category_id) {
    const category = await supabase.from("categories").select("type").eq("id", data.category_id).eq("user_id", id).single();
    if (category.error || !category.data || category.data.type !== "both" && category.data.type !== data.type) return { message: "", error: "Veldu flokk sem passar við tegund færslunnar." };
  }
  if (data.id) {
    const linked = await supabase.from("bill_payments").select("id,amount,paid_at").eq("transaction_id", data.id).eq("user_id", id);
    if (linked.error) throw new Error("Ekki tókst að athuga hvort færslan sé tengd reikningi. Reyndu aftur.");
    if (linked.data.some((payment) => Number(payment.amount) !== data.amount || payment.paid_at !== data.date || data.type !== "expense")) return { message: "", error: "Færslan er tengd greiðslu reiknings. Aftengdu greiðsluna á síðunni Reikningar áður en þú breytir upphæð, dagsetningu eða tegund." };
  }
  const payload = { ...data, user_id: id, note: data.note || null, category_id: data.category_id || null };
  const result = data.id
    ? await supabase.from("transactions").update(payload).eq("id", data.id).eq("user_id", id)
    : await supabase.from("transactions").insert(payload);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/", "layout");
  return { message: data.id ? "Færslan var uppfærð." : "Færslunni var bætt við." } satisfies ActionFeedback;
}

export async function deleteTransaction(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const linked = await supabase.from("bill_payments").select("id").eq("transaction_id", String(formData.get("id"))).eq("user_id", id);
  if (linked.error) throw new Error("Ekki tókst að athuga hvort færslan sé tengd reikningi. Reyndu aftur.");
  if (linked.data.length) return { message: "", error: "Aftengdu greiðslu reikningsins áður en þú eyðir færslunni." };
  const result = await supabase.from("transactions").delete().eq("id", String(formData.get("id"))).eq("user_id", id);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/", "layout");
  return { message: "Færslunni var eytt." } satisfies ActionFeedback;
}

export async function deleteAllTransactions() {
  const { supabase, userId: id } = await userId();
  const linked = await supabase.from("bill_payments").select("id,transaction_id").eq("user_id", id);
  if (linked.error) throw new Error("Ekki tókst að athuga hvort færslurnar séu tengdar reikningum. Reyndu aftur.");
  if (linked.data.some((payment) => payment.transaction_id)) return { message: "", error: "Sumar færslur eru tengdar reikningum. Aftengdu greiðslurnar á síðunni Reikningar áður en þú eyðir öllum færslum." };
  const result = await supabase.from("transactions").delete().eq("user_id", id);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/", "layout");
  return { message: "Öllum færslum var eytt." } satisfies ActionFeedback;
}

export async function saveCategory(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const data = categorySchema.parse(formDataObject(formData));
  const payload = { name: data.name, type: data.type, user_id: id, is_default: false };
  const result = data.id
    ? await supabase.from("categories").update(payload).eq("id", data.id).eq("user_id", id)
    : await supabase.from("categories").insert(payload);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/", "layout");
  return { message: data.id ? "Flokkurinn var uppfærður." : "Flokknum var bætt við." } satisfies ActionFeedback;
}

export async function deleteCategory(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const result = await supabase.from("categories").delete().eq("id", String(formData.get("id"))).eq("user_id", id).eq("is_default", false);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/", "layout");
  return { message: "Flokknum var eytt." } satisfies ActionFeedback;
}

export async function saveBudget(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const data = budgetSchema.parse(formDataObject(formData));
  const payload = { ...data, user_id: id, category_id: data.category_id || null };
  const result = data.id
    ? await supabase.from("budgets").update(payload).eq("id", data.id).eq("user_id", id)
    : await supabase.from("budgets").insert(payload);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/", "layout");
  return { message: data.id ? "Útgjaldamarkmiðið var uppfært." : "Útgjaldamarkmiðið var vistað." } satisfies ActionFeedback;
}

export async function deleteBudget(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const result = await supabase.from("budgets").delete().eq("id", String(formData.get("id"))).eq("user_id", id);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/", "layout");
  return { message: "Útgjaldamarkmiðinu var eytt." } satisfies ActionFeedback;
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
  let result;

  if (data.id) {
    result = await supabase
      .from("bills")
      .update(payload)
      .eq("id", data.id)
      .eq("user_id", id)
      .eq("month", data.month);
  } else {
    let seriesQuery = supabase
      .from("bills")
      .select("series_id")
      .eq("user_id", id)
      .eq("name", data.name)
      .order("month", { ascending: false })
      .limit(1);

    seriesQuery = data.category_id
      ? seriesQuery.eq("category_id", data.category_id)
      : seriesQuery.is("category_id", null);

    const { data: existingSeries, error: seriesError } = await seriesQuery.maybeSingle();
    if (seriesError) throw new Error(seriesError.message);

    result = await supabase.from("bills").insert({
      ...payload,
      month: data.month,
      ...(existingSeries?.series_id ? { series_id: existingSeries.series_id } : {})
    });
  }

  if (result.error?.code === "23505") {
    throw new Error("Reikningur með þessu heiti er þegar skráður í mánuðinum.");
  }
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/", "layout");
  return { message: data.id ? "Reikningurinn var uppfærður." : "Reikningurinn var vistaður fyrir valinn mánuð.", redirectTo: `/bills?month=${data.month.slice(0, 7)}` } satisfies ActionFeedback;
}

export async function deleteBill(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const data = billDeleteSchema.parse(formDataObject(formData));
  const month = `${data.month}-01`;
  const { data: bill, error: billError } = await supabase
    .from("bills")
    .select("id, series_id, month")
    .eq("id", data.id)
    .eq("user_id", id)
    .single();
  if (billError) throw new Error(billError.message);
  if (bill.month !== month) throw new Error("Reikningurinn tilheyrir ekki völdum mánuði.");

  const result = data.scope === "all"
    ? await supabase.from("bills").delete().eq("series_id", bill.series_id).eq("user_id", id)
    : await supabase.from("bills").delete().eq("id", bill.id).eq("user_id", id).eq("month", month);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/", "layout");
  return { message: data.scope === "all" ? "Reikningnum var eytt úr öllum mánuðum." : "Reikningnum var eytt úr völdum mánuði." } satisfies ActionFeedback;
}

export async function markBillPaid(formData: FormData) {
  return (await import("@/lib/bill-actions")).recordBillPayment(formData);
}

export async function deleteBillPayment(formData: FormData) {
  return (await import("@/lib/bill-actions")).unlinkBillPayment(formData);
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
  revalidatePath("/", "layout");
  return { message: data.id ? "Tekjufærslan var uppfærð." : "Tekjurnar voru skráðar." } satisfies ActionFeedback;
}

export async function deleteMonthlyIncome(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const result = await supabase.from("transactions").delete().eq("id", String(formData.get("id"))).eq("user_id", id).eq("type", "income");
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/", "layout");
  return { message: "Tekjufærslunni var eytt." } satisfies ActionFeedback;
}

export async function saveSavingsGoal(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const data = savingsGoalSchema.parse(formDataObject(formData));
  const payload = { ...data, user_id: id, target_date: data.target_date || null };
  const result = data.id
    ? await supabase.from("savings_goals").update(payload).eq("id", data.id).eq("user_id", id)
    : await supabase.from("savings_goals").insert(payload);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/", "layout");
  return { message: data.id ? "Sparnaðarmarkmiðið var uppfært." : "Sparnaðarmarkmiðið var vistað." } satisfies ActionFeedback;
}

export async function deleteSavingsGoal(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const result = await supabase.from("savings_goals").delete().eq("id", String(formData.get("id"))).eq("user_id", id);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/", "layout");
  return { message: "Sparnaðarmarkmiðinu var eytt." } satisfies ActionFeedback;
}

export async function addSavingsContribution(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const data = savingsContributionSchema.parse(formDataObject(formData));
  const result = await supabase.from("savings_contributions").insert({ ...data, user_id: id, note: data.note || null });
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/", "layout");
  return { message: "Framlagið var skráð í sparnaðinn." } satisfies ActionFeedback;
}

export async function deleteSavingsContribution(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const result = await supabase.from("savings_contributions").delete().eq("id", String(formData.get("id"))).eq("user_id", id);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/", "layout");
  return { message: "Sparnaðarframlaginu var eytt." } satisfies ActionFeedback;
}

export async function deleteAllSavingsContributions() {
  const { supabase, userId: id } = await userId();
  const result = await supabase.from("savings_contributions").delete().eq("user_id", id);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/", "layout");
  return { message: "Öllum sparnaðarframlögum var eytt." } satisfies ActionFeedback;
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
  revalidatePath("/", "layout");
  return { message: "Sparnaðarstaðan var uppfærð." } satisfies ActionFeedback;
}

export async function addSavingsBucketAmount(formData: FormData) {
  const { supabase } = await userId();
  const parsed = savingsBucketEntrySchema.safeParse(formDataObject(formData));
  if (!parsed.success) return { message: "", error: "Veldu gilda dagsetningu og sláðu inn upphæð yfir núlli, með að hámarki tveimur aukastöfum." } satisfies ActionFeedback;
  const data = parsed.data;
  const { error } = await supabase.rpc("add_savings_bucket_contribution", {
    p_request_id: data.request_id,
    p_bucket_type: data.bucket_type,
    p_amount: data.amount,
    p_date: data.date,
    p_note: data.note || null,
    p_label: data.label
  });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  return { message: "Upphæðinni var bætt við sparnaðinn." } satisfies ActionFeedback;
}

export async function deleteSavingsBucket(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const result = await supabase
    .from("savings_buckets")
    .delete()
    .eq("user_id", id)
    .eq("bucket_type", String(formData.get("bucket_type")));
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/", "layout");
  return { message: "Sparnaðarflokknum var eytt." } satisfies ActionFeedback;
}

export async function saveProfile(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const data = profileSchema.parse(formDataObject(formData));
  const result = await supabase.from("profiles").update(data).eq("id", id);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/", "layout");
  return { message: "Upplýsingarnar þínar voru uppfærðar." } satisfies ActionFeedback;
}
