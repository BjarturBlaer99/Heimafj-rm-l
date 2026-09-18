import { addMonths, format, parseISO, startOfMonth, subMonths } from "date-fns";
import { redirect } from "next/navigation";
import { cache } from "react";
import { currentMonth, monthStart } from "@/lib/format";
import { mergeSavingsBuckets } from "@/lib/savings-buckets";
import { readAllPages } from "@/lib/read-all";
import { createClient } from "@/lib/supabase/server";
import type { BillPayment, BillWithPayment, Budget, Category, Profile, SavingsBucket, SavingsBucketEntry, SavingsContribution, SavingsGoal, Transaction } from "@/lib/types";

export const getAuthed = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, user: data.user };
});

// React cache only deduplicates reads within a server request; personal data is
// never stored in a shared, persistent Next.js cache.
export const getProfile = cache(async () => {
  const { supabase, user } = await getAuthed();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (error) throw new Error("Ekki tókst að sækja aðgangsupplýsingar.");
  return data ? { ...data, currency: "ISK" } as Profile : null;
});

export const getCategories = cache(async () => {
  const { supabase, user } = await getAuthed();
  const readCategories = () => supabase.from("categories").select("*").order("is_default", { ascending: false }).order("name");
  const { data, error } = await readCategories();
  const categories = (data ?? []) as Category[];
  if (error) throw new Error("Ekki tókst að sækja flokka.");

  // New accounts are seeded by the database. Repair older accounts only when
  // needed, instead of making every page visit wait for a database write.
  const missingDefaults = ["Áskriftir", "Reikningar"].filter((name) =>
    !categories.some((category) => category.name === name && category.type === "expense" && category.is_default)
  );
  if (missingDefaults.length === 0) return categories;

  const result = await supabase.from("categories").upsert(
    missingDefaults.map((name) => ({ user_id: user.id, name, type: "expense", is_default: true })),
    { onConflict: "user_id,name" }
  );
  if (result.error) return categories;

  const refreshed = await readCategories();
  return (refreshed.data ?? categories) as Category[];
});

export const getCategoryById = cache(async (id: string) => {
  const categories = await getCategories();
  const category = categories.find((item) => item.id === id);
  if (category) return category;

  // Keep direct lookup working even when an account exceeds the API's list cap.
  const { supabase } = await getAuthed();
  const { data } = await supabase.from("categories").select("*").eq("id", id).single();
  return (data ?? null) as Category | null;
});

type TransactionFilters = { month?: string; type?: string; category?: string; search?: string; from?: string; to?: string; id?: string };

export function getTransactions(filters?: TransactionFilters) {
  // Primitive arguments allow separate callers with equivalent filter objects
  // to share a query during the same render.
  return getTransactionsForFilters(filters?.month, filters?.type, filters?.category, filters?.search, filters?.from, filters?.to, filters?.id);
}

const getTransactionsForFilters = cache(async (month?: string, type?: string, category?: string, search?: string, from?: string, to?: string, id?: string) => {
  const { supabase } = await getAuthed();
  let query = supabase.from("transactions").select("*, categories(id, name, type)").order("date", { ascending: false }).order("id", { ascending: false });
  if (month && !from && !to) {
    const start = monthStart(month);
    const end = format(addMonths(parseISO(start), 1), "yyyy-MM-dd");
    query = query.gte("date", start).lt("date", end);
  }
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);
  if (type) query = query.eq("type", type);
  if (category) query = query.eq("category_id", category);
  if (search) query = query.ilike("note", `%${search}%`);
  if (id) query = query.eq("id", id);
  return readAllPages<Transaction>((fromIndex, toIndex) => query.range(fromIndex, toIndex));
});

export const getBudgets = cache(async (month = currentMonth()) => {
  const { supabase } = await getAuthed();
  const { data, error } = await supabase.from("budgets").select("*, categories(id, name, type)").eq("month", monthStart(month)).order("created_at");
  if (error) throw new Error("Ekki tókst að sækja útgjaldaáætlun.");
  return (data ?? []) as Budget[];
});

export const getAllBudgets = cache(async () => {
  const { supabase } = await getAuthed();
  return readAllPages<Budget>((from, to) => supabase.from("budgets").select("*, categories(id, name, type)").order("month", { ascending: false }).order("id").range(from, to));
});

export const getBillsForMonth = cache(async (month = currentMonth()) => {
  const { supabase } = await getAuthed();
  const monthDate = monthStart(month);
  const [billsResult, paymentsResult] = await Promise.all([
    supabase
      .from("bills")
      .select("*, categories(id, name, type)")
      .eq("month", monthDate)
      .order("is_active", { ascending: false })
      .order("due_day")
      .order("name"),
    supabase.from("bill_payments").select("*").eq("month", monthDate)
  ]);

  if (billsResult.error || paymentsResult.error) return { schemaReady: false, bills: [] as BillWithPayment[] };
  const paymentsByBill = new Map((paymentsResult.data ?? []).map((payment) => [payment.bill_id, payment as BillPayment]));
  return {
    schemaReady: !billsResult.error && !paymentsResult.error,
    bills: ((billsResult.data ?? []) as BillWithPayment[]).map((bill) => ({
      ...bill,
      payment: paymentsByBill.get(bill.id) ?? null
    }))
  };
});

export const getSavingsGoals = cache(async () => {
  const { supabase } = await getAuthed();
  const { data, error } = await supabase.from("savings_goals").select("*").order("created_at", { ascending: false });
  if (error) throw new Error("Ekki tókst að sækja sparnaðarmarkmið.");
  return (data ?? []) as SavingsGoal[];
});

export const getSavingsContributions = cache(async (month?: string) => {
  const { supabase } = await getAuthed();
  let query = supabase.from("savings_contributions").select("*").order("date", { ascending: false });
  if (month) {
    const start = monthStart(month);
    const end = format(addMonths(parseISO(start), 1), "yyyy-MM-dd");
    query = query.gte("date", start).lt("date", end);
  }
  return readAllPages<SavingsContribution>((from, to) => query.order("id").range(from, to));
});

export const getSavingsBuckets = cache(async () => {
  const { supabase, user } = await getAuthed();
  const { data, error } = await supabase.from("savings_buckets").select("*").order("created_at");

  return {
    schemaReady: !error,
    buckets: !error ? mergeSavingsBuckets(user.id, (data ?? []) as SavingsBucket[]) : []
  };
});

export const getSavingsBucketEntries = cache(async (limit = 20) => {
  const { supabase } = await getAuthed();
  const { data, error } = await supabase.from("savings_bucket_entries").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }).limit(limit);
  return {
    schemaReady: !error,
    entries: !error ? ((data ?? []) as SavingsBucketEntry[]) : []
  };
});

export async function getDashboardData() {
  const month = currentMonth();
  const trendMonths = 6;
  const trendStart = startOfMonth(subMonths(new Date(), trendMonths - 1));
  const [profile, trendTransactions, budgets, goals, savingsBucketsResult, billsResult] = await Promise.all([
    getProfile(),
    getTransactions({ from: format(trendStart, "yyyy-MM-dd") }),
    getBudgets(month),
    getSavingsGoals(),
    getSavingsBuckets(),
    getBillsForMonth(month)
  ]);
  const transactions = trendTransactions.filter((item) => item.date.startsWith(month));
  const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0);
  const expenses = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount), 0);
  const savings = income - expenses;
  const budgeted = budgets.reduce((sum, item) => sum + Number(item.amount), 0);
  const remainingBudget = budgeted - expenses;
  const spendingByCategory = categoryTotals(transactions.filter((item) => item.type === "expense"));
  const trend = buildMonthlyTrend(trendTransactions, trendMonths);
  const totalSavingsBalance = savingsBucketsResult.buckets.reduce((sum, bucket) => sum + Number(bucket.amount), 0);
  const activeBills = billsResult.bills.filter((bill) => bill.is_active);
  const paidBills = activeBills.filter((bill) => bill.payment);
  const unpaidBills = activeBills.filter((bill) => !bill.payment);
  const { supabase } = await getAuthed();
  const [olderTransactions, olderBills] = await Promise.all([
    trendTransactions.length ? null : supabase.from("transactions").select("id").limit(1),
    billsResult.bills.length ? null : supabase.from("bills").select("id").limit(1)
  ]);
  if (olderTransactions?.error || olderBills?.error) throw new Error("Ekki tókst að sækja uppsetningarstöðu.");
  return {
    hasAnyTransactions: trendTransactions.length > 0 || Boolean(olderTransactions?.data?.length),
    hasAnyBills: billsResult.bills.length > 0 || Boolean(olderBills?.data?.length),
    profile,
    transactions,
    budgets,
    goals,
    income,
    expenses,
    savings,
    budgeted,
    remainingBudget,
    spendingByCategory,
    trend,
    savingsBuckets: savingsBucketsResult.buckets,
    savingsBucketsReady: savingsBucketsResult.schemaReady,
    totalSavingsBalance,
    billsReady: billsResult.schemaReady,
    bills: billsResult.bills,
    activeBills,
    paidBills,
    unpaidBills,
    paidBillsTotal: paidBills.reduce((sum, bill) => sum + Number(bill.payment?.amount ?? 0), 0),
    unpaidBillsTotal: unpaidBills.reduce((sum, bill) => sum + Number(bill.amount), 0)
  };
}

export async function getMonthlyOverviewData(month = currentMonth()) {
  const [transactions, budgets, billsResult, contributions] = await Promise.all([
    getTransactions({ month }),
    getBudgets(month),
    getBillsForMonth(month),
    getSavingsContributions(month)
  ]);
  const incomeTransactions = transactions.filter((item) => item.type === "income");
  const expenseTransactions = transactions.filter((item) => item.type === "expense");
  const income = incomeTransactions.reduce((sum, item) => sum + Number(item.amount), 0);
  const expenses = expenseTransactions.reduce((sum, item) => sum + Number(item.amount), 0);
  const budgeted = budgets.reduce((sum, item) => sum + Number(item.amount), 0);
  const overallBudget = budgets.find((budget) => budget.category_id === null) ?? null;
  const paidBills = billsResult.bills.filter((bill) => bill.payment);
  const unpaidBills = billsResult.bills.filter((bill) => bill.is_active && !bill.payment);
  const savingsContributions = contributions.filter((item) => item.date.startsWith(month));
  const savingsContributed = savingsContributions.reduce((sum, item) => sum + Number(item.amount), 0);

  return {
    month,
    transactions,
    incomeTransactions,
    expenseTransactions,
    budgets,
    overallBudget,
    income,
    expenses,
    savings: income - expenses,
    budgeted,
    spendingByCategory: categoryTotals(expenseTransactions),
    incomeByCategory: categoryTotals(incomeTransactions),
    billsReady: billsResult.schemaReady,
    bills: billsResult.bills,
    paidBills,
    unpaidBills,
    paidBillsTotal: paidBills.reduce((sum, bill) => sum + Number(bill.payment?.amount ?? 0), 0),
    unpaidBillsTotal: unpaidBills.reduce((sum, bill) => sum + Number(bill.amount), 0),
    savingsContributions,
    savingsContributed
  };
}

export const getOverviewMonths = cache(async (limit = 18) => {
  const { supabase } = await getAuthed();
  const [transactionsResult, budgetsResult, contributionsResult, billsResult] = await Promise.all([
    supabase.from("transactions").select("date").order("date", { ascending: false }),
    supabase.from("budgets").select("month").order("month", { ascending: false }).order("created_at"),
    supabase.from("savings_contributions").select("date").order("date", { ascending: false }),
    supabase.from("bills").select("month")
  ]);
  const months = new Set<string>([currentMonth()]);
  if ([transactionsResult, budgetsResult, contributionsResult, billsResult].some((result) => result.error)) throw new Error("Ekki tókst að sækja tímabil.");
  (transactionsResult.data ?? []).forEach((item) => months.add(item.date.slice(0, 7)));
  (budgetsResult.data ?? []).forEach((item) => months.add(item.month.slice(0, 7)));
  (contributionsResult.data ?? []).forEach((item) => months.add(item.date.slice(0, 7)));
  (billsResult.data ?? []).forEach((item) => months.add(item.month.slice(0, 7)));
  return [...months].sort((left, right) => right.localeCompare(left)).slice(0, limit);
});

export async function monthlyTrend(months = 8) {
  const start = startOfMonth(subMonths(new Date(), months - 1));
  const transactions = await getTransactions({ from: format(start, "yyyy-MM-dd") });
  return buildMonthlyTrend(transactions, months);
}

export function buildMonthlyTrend(transactions: Transaction[], months: number) {
  const start = startOfMonth(subMonths(new Date(), months - 1));
  return Array.from({ length: months }, (_, index) => {
    const date = addMonths(start, index);
    const key = format(date, "yyyy-MM");
    const label = new Intl.DateTimeFormat("is-IS", { month: "short", year: "numeric" }).format(date);
    const rows = transactions.filter((item) => item.date.startsWith(key));
    const income = rows.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0);
    const expenses = rows.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount), 0);
    return { month: label, income, expenses, savings: income - expenses };
  });
}

export function categoryTotals(transactions: Transaction[]) {
  const totals = new Map<string, number>();
  for (const tx of transactions) {
    const name = tx.categories?.name ?? "Óflokkað";
    totals.set(name, (totals.get(name) ?? 0) + Number(tx.amount));
  }
  return [...totals.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}
