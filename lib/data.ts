import { addMonths, format, parseISO, startOfMonth, subMonths } from "date-fns";
import { redirect } from "next/navigation";
import { cache } from "react";
import { currentMonth, monthStart } from "@/lib/format";
import { fallbackSavingsBuckets, mergeSavingsBuckets } from "@/lib/savings-buckets";
import { createClient } from "@/lib/supabase/server";
import type { BillPayment, BillWithPayment, Budget, Category, Profile, SavingsBucket, SavingsBucketEntry, SavingsContribution, SavingsGoal, Transaction } from "@/lib/types";

export const getAuthed = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, user: data.user };
});

async function ensureSystemCategories() {
  const { supabase, user } = await getAuthed();
  await supabase
    .from("categories")
    .upsert(
      [
        {
          user_id: user.id,
          name: "Áskriftir",
          type: "expense",
          is_default: true
        },
        {
          user_id: user.id,
          name: "Reikningar",
          type: "expense",
          is_default: true
        }
      ],
      { onConflict: "user_id,name" }
    );
}

export async function getProfile() {
  const { supabase, user } = await getAuthed();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data as Profile | null;
}

export async function getCategories() {
  await ensureSystemCategories();
  const { supabase } = await getAuthed();
  const { data } = await supabase.from("categories").select("*").order("is_default", { ascending: false }).order("name");
  return (data ?? []) as Category[];
}

export async function getCategoryById(id: string) {
  await ensureSystemCategories();
  const { supabase } = await getAuthed();
  const { data } = await supabase.from("categories").select("*").eq("id", id).single();
  return (data ?? null) as Category | null;
}

export async function getTransactions(filters?: { month?: string; type?: string; category?: string; search?: string; from?: string; to?: string }) {
  const { supabase } = await getAuthed();
  let query = supabase.from("transactions").select("*, categories(id, name, type)").order("date", { ascending: false });
  if (filters?.month) {
    const start = monthStart(filters.month);
    const end = format(addMonths(parseISO(start), 1), "yyyy-MM-dd");
    query = query.gte("date", start).lt("date", end);
  }
  if (filters?.from) query = query.gte("date", filters.from);
  if (filters?.to) query = query.lte("date", filters.to);
  if (filters?.type) query = query.eq("type", filters.type);
  if (filters?.category) query = query.eq("category_id", filters.category);
  if (filters?.search) query = query.ilike("note", `%${filters.search}%`);
  const { data } = await query;
  return (data ?? []) as Transaction[];
}

export async function getBudgets(month = currentMonth()) {
  const { supabase } = await getAuthed();
  const { data } = await supabase.from("budgets").select("*, categories(id, name, type)").eq("month", monthStart(month)).order("created_at");
  return (data ?? []) as Budget[];
}

export async function getAllBudgets() {
  const { supabase } = await getAuthed();
  const { data } = await supabase.from("budgets").select("*, categories(id, name, type)").order("month", { ascending: false }).order("created_at");
  return (data ?? []) as Budget[];
}

export async function getBillsForMonth(month = currentMonth()) {
  const { supabase } = await getAuthed();
  const monthDate = monthStart(month);
  const [billsResult, paymentsResult] = await Promise.all([
    supabase.from("bills").select("*, categories(id, name, type)").order("is_active", { ascending: false }).order("due_day").order("name"),
    supabase.from("bill_payments").select("*").eq("month", monthDate)
  ]);

  const paymentsByBill = new Map((paymentsResult.data ?? []).map((payment) => [payment.bill_id, payment as BillPayment]));
  return {
    schemaReady: !billsResult.error && !paymentsResult.error,
    bills: ((billsResult.data ?? []) as BillWithPayment[]).map((bill) => ({
      ...bill,
      payment: paymentsByBill.get(bill.id) ?? null
    }))
  };
}

export async function getSavingsGoals() {
  const { supabase } = await getAuthed();
  const { data } = await supabase.from("savings_goals").select("*").order("created_at", { ascending: false });
  return (data ?? []) as SavingsGoal[];
}

export async function getSavingsContributions() {
  const { supabase } = await getAuthed();
  const { data } = await supabase.from("savings_contributions").select("*").order("date", { ascending: false });
  return (data ?? []) as SavingsContribution[];
}

export async function getSavingsBuckets() {
  const { supabase, user } = await getAuthed();
  const { data, error } = await supabase.from("savings_buckets").select("*").order("created_at");

  return {
    schemaReady: !error,
    buckets: !error ? mergeSavingsBuckets(user.id, (data ?? []) as SavingsBucket[]) : fallbackSavingsBuckets(user.id)
  };
}

export async function getSavingsBucketEntries(limit = 20) {
  const { supabase } = await getAuthed();
  const { data, error } = await supabase.from("savings_bucket_entries").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }).limit(limit);
  return {
    schemaReady: !error,
    entries: !error ? ((data ?? []) as SavingsBucketEntry[]) : []
  };
}

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
  return {
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
    getSavingsContributions()
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

export async function getOverviewMonths(limit = 18) {
  const [transactions, budgets, contributions] = await Promise.all([getTransactions(), getAllBudgets(), getSavingsContributions()]);
  const months = new Set<string>([currentMonth()]);
  transactions.forEach((item) => months.add(item.date.slice(0, 7)));
  budgets.forEach((item) => months.add(item.month.slice(0, 7)));
  contributions.forEach((item) => months.add(item.date.slice(0, 7)));
  return [...months].sort((left, right) => right.localeCompare(left)).slice(0, limit);
}

export async function monthlyTrend(months = 8) {
  const start = startOfMonth(subMonths(new Date(), months - 1));
  const transactions = await getTransactions({ from: format(start, "yyyy-MM-dd") });
  return buildMonthlyTrend(transactions, months);
}

function buildMonthlyTrend(transactions: Transaction[], months: number) {
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
