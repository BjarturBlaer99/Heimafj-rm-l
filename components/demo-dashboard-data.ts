import { demoBills, demoCategories, demoSavings, demoTransactions, demoTrend, type DemoTransaction } from "@/lib/demo-data";
import type { BillWithPayment, SavingsBucket, Transaction } from "@/lib/types";
import type { DashboardOverviewData } from "@/components/dashboard-overview";

export const demoMonth = "2026-06";
const timestamp = `${demoMonth}-01T12:00:00Z`;
const userId = "demo";

// Complete the sample ledger so category charts and monthly totals agree with
// the rows that can actually be inspected in the transaction view.
const remainingExpenses: DemoTransaction[] = demoCategories.flatMap((category, index) => {
  const listed = demoTransactions.filter((tx) => tx.kind === "expense" && tx.category === category.name).reduce((sum, tx) => sum + tx.amount, 0);
  const amount = category.value - listed;
  return amount > 0 ? [{ id: `tx-category-${index}`, merchant: `Aðrar færslur · ${category.name}`, category: category.name, date: "2. júní", amount, kind: "expense" as const }] : [];
});
export const demoDisplayTransactions = [...demoTransactions, ...remainingExpenses].sort((a, b) => Number.parseInt(b.date) - Number.parseInt(a.date));

const transactions: Transaction[] = demoDisplayTransactions.filter((tx) => tx.kind !== "saving").map((tx) => ({
  id: tx.id, user_id: userId, category_id: tx.category, amount: tx.amount,
  type: tx.kind === "income" ? "income" : "expense",
  date: `${demoMonth}-${String(Number.parseInt(tx.date)).padStart(2, "0")}`,
  note: tx.merchant, created_at: timestamp, updated_at: timestamp,
  categories: { id: tx.category, name: tx.category, type: tx.kind === "income" ? "income" : "expense" }
}));
const bills: BillWithPayment[] = demoBills.map((bill) => ({
  id: bill.id, user_id: userId, series_id: bill.id, category_id: null, month: `${demoMonth}-01`,
  name: bill.name, amount: bill.amount, due_day: Number.parseInt(bill.due), is_active: true, created_at: timestamp, updated_at: timestamp,
  payment: bill.paid ? { id: `paid-${bill.id}`, user_id: userId, bill_id: bill.id, transaction_id: null, month: `${demoMonth}-01`, amount: bill.amount, paid_at: timestamp, created_at: timestamp } : null
}));
const savingsBuckets: SavingsBucket[] = demoSavings.map((saving, index) => ({
  id: saving.id, user_id: userId, bucket_type: index === 0 ? "serignarsparnadur" : "husnaedisparnadur", label: saving.name, amount: saving.current, created_at: timestamp, updated_at: timestamp
}));
const income = transactions.filter((tx) => tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0);
const expenses = transactions.filter((tx) => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);
const paidBills = bills.filter((bill) => bill.payment);
const unpaidBills = bills.filter((bill) => !bill.payment);
const totalSavingsBalance = savingsBuckets.reduce((sum, bucket) => sum + bucket.amount, 0);

export const demoDashboardData: DashboardOverviewData = {
  profile: { id: userId, full_name: "Test User", currency: "ISK" },
  hasAnyTransactions: true, hasAnyBills: true,
  transactions, budgets: [],
  goals: [{ id: "demo-goal", user_id: userId, title: "Varasjóður og húsnæði", target_amount: demoSavings.reduce((sum, saving) => sum + saving.target, 0), current_amount: totalSavingsBalance, target_date: null, created_at: timestamp, updated_at: timestamp }],
  income, expenses, savings: income - expenses, budgeted: 0, remainingBudget: -expenses,
  spendingByCategory: demoCategories,
  trend: demoTrend.map((row) => ({ ...row, month: `${row.month} 2026` })),
  savingsBuckets, savingsBucketsReady: true, totalSavingsBalance, goalSavingsBalance: totalSavingsBalance,
  billsReady: true, bills, activeBills: bills, paidBills, unpaidBills,
  paidBillsTotal: paidBills.reduce((sum, bill) => sum + (bill.payment?.amount ?? 0), 0),
  unpaidBillsTotal: unpaidBills.reduce((sum, bill) => sum + bill.amount, 0)
};
