import { monthKey, monthLabel, monthStart, shiftMonth } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { financeError, validateId, validateMonth } from '@/lib/finance-validation';
import { normalizeSavingsPreferences, type SavingsPreferences } from '@/lib/savings-preferences';
import type { SavingsBucketEntry, SavingsBucketType } from '@/types/finance';
import type { Bill, BillPayment, BillWithPayment, Category, DashboardSnapshot, Profile, SavingsBucket, SavingsContribution, SavingsGoal, Transaction, TransactionPage, TransactionType } from '@/types/finance';

const transactionSelection = 'id,user_id,category_id,amount,type,date,note,created_at,categories(id,name,type)';
type RawTransaction = Omit<Transaction, 'categories'> & { categories: Transaction['categories'] | Transaction['categories'][] };
type ReadResult = { data: unknown[] | null; error: { code?: string } | null };

function normalizeTransactions(rows: RawTransaction[]): Transaction[] {
  return rows.map((row) => ({ ...row, amount: Number(row.amount), categories: Array.isArray(row.categories) ? row.categories[0] ?? null : row.categories }));
}

// A stable ID order breaks date ties. Continue even when the service returns
// fewer rows than requested, so a configured server row cap cannot hide totals.
async function readAll<T>(page: (from: number, to: number) => PromiseLike<ReadResult>, maximum = Infinity): Promise<T[]> {
  const rows: T[] = [];
  while (rows.length < maximum) {
    const result = await page(rows.length, rows.length + Math.min(500, maximum - rows.length) - 1);
    if (result.error) throw financeError(result.error, 'Ekki tókst að sækja gögn. Athugaðu tenginguna og reyndu aftur.');
    if (!result.data?.length) break;
    rows.push(...result.data as T[]);
  }
  return rows;
}

function totals(rows: Transaction[]) {
  return {
    income: rows.filter((row) => row.type === 'income').reduce((sum, row) => sum + Math.round(row.amount * 100), 0) / 100,
    expenses: rows.filter((row) => row.type === 'expense').reduce((sum, row) => sum + Math.round(row.amount * 100), 0) / 100,
  };
}

async function transactionsBetween(userId: string, from: string, until: string) {
  validateId(userId);
  return normalizeTransactions(await readAll<RawTransaction>((start, end) => supabase.from('transactions').select(transactionSelection)
    .eq('user_id', userId).gte('date', from).lt('date', until)
    .order('date', { ascending: false }).order('created_at', { ascending: false }).order('id').range(start, end)));
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  validateId(userId);
  const result = await supabase.from('profiles').select('id,full_name,currency').eq('id', userId).maybeSingle();
  if (result.error) throw financeError(result.error, 'Ekki tókst að sækja aðgangsupplýsingar. Reyndu aftur.');
  return result.data as Profile | null;
}

export async function fetchCategories(userId: string): Promise<Category[]> {
  validateId(userId);
  return readAll<Category>((from, to) => supabase.from('categories').select('id,name,type').eq('user_id', userId).order('name').order('id').range(from, to));
}

export async function fetchDashboard(userId: string): Promise<DashboardSnapshot> {
  const currentMonth = monthKey();
  const trendKeys = Array.from({ length: 6 }, (_, index) => shiftMonth(currentMonth, index - 5));
  const [profile, transactions, savings] = await Promise.all([
    fetchProfile(userId),
    transactionsBetween(userId, monthStart(trendKeys[0]), monthStart(shiftMonth(currentMonth, 1))),
    readAll<{ amount: number }>((from, to) => supabase.from('savings_buckets').select('id,amount').eq('user_id', validateId(userId)).order('id').range(from, to)),
  ]);
  const current = totals(transactions.filter((row) => row.date.startsWith(currentMonth)));
  return {
    profile, monthKey: currentMonth, ...current, balance: current.income - current.expenses,
    savings: savings.reduce((sum, row) => sum + Math.round(Number(row.amount) * 100), 0) / 100,
    recentTransactions: transactions.slice(0, 5),
    trend: trendKeys.map((key) => {
      const summary = totals(transactions.filter((row) => row.date.startsWith(key)));
      return { key, label: monthLabel(key, 'short').replace('.', ''), income: summary.income, expense: summary.expenses };
    }),
  };
}

export async function fetchTransactions(limit = 100): Promise<Transaction[]> {
  if (!Number.isInteger(limit) || limit < 1) throw new Error('Ógildur fjöldi færslna.');
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Skráðu þig inn til að sjá færslur.');
  return normalizeTransactions(await readAll<RawTransaction>((from, to) => supabase.from('transactions').select(transactionSelection)
    .eq('user_id', data.user.id).order('date', { ascending: false }).order('created_at', { ascending: false }).order('id').range(from, to), limit));
}

export async function fetchTransactionPage(userId: string, options: { month: string; type?: TransactionType | 'all'; search?: string; offset?: number; limit?: number }): Promise<TransactionPage> {
  const month = validateMonth(options.month);
  const rows = await fetchTransactionMonth(userId, month);
  return selectTransactionPage(rows, options);
}

export function fetchTransactionMonth(userId: string, month: string): Promise<Transaction[]> {
  validateMonth(month);
  return transactionsBetween(userId, monthStart(month), monthStart(shiftMonth(month, 1)));
}

export function selectTransactionPage(rows: Transaction[], options: { type?: TransactionType | 'all'; search?: string; offset?: number; limit?: number }): TransactionPage {
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 50;
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1) throw new Error('Ógild síða færslna.');
  const normalize = (text: string) => text.trim().toLocaleLowerCase('is-IS').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const search = normalize(options.search ?? '');
  const filtered = rows.filter((row) => (!options.type || options.type === 'all' || row.type === options.type)
    && (!search || normalize(`${row.note ?? ''} ${row.categories?.name ?? ''}`).includes(search)));
  return { items: filtered.slice(offset, offset + limit), hasMore: filtered.length > offset + limit, ...totals(rows) };
}

export async function fetchBills(userId: string, selectedMonth = monthKey()): Promise<BillWithPayment[]> {
  validateId(userId);
  const month = monthStart(validateMonth(selectedMonth));
  const [bills, payments] = await Promise.all([
    readAll<Bill>((from, to) => supabase.from('bills').select('id,user_id,series_id,category_id,month,name,amount,due_day,is_active').eq('user_id', userId).eq('month', month).order('due_day').order('id').range(from, to)),
    readAll<BillPayment>((from, to) => supabase.from('bill_payments').select('id,bill_id,transaction_id,month,amount,paid_at').eq('user_id', userId).eq('month', month).order('id').range(from, to)),
  ]);
  const byBill = new Map(payments.map((row) => [row.bill_id, { ...row, amount: Number(row.amount) }]));
  return bills.map((bill) => ({ ...bill, amount: Number(bill.amount), payment: byBill.get(bill.id) ?? null }));
}

export async function fetchSavings(userId: string): Promise<{ buckets: SavingsBucket[]; goals: SavingsGoal[]; preferences: SavingsPreferences }> {
  validateId(userId);
  const account = await supabase.auth.getUser();
  if (account.error || account.data.user?.id !== userId) throw new Error('Skráðu þig aftur inn til að sjá sparnaðinn.');
  const [buckets, goals] = await Promise.all([
    readAll<SavingsBucket>((from, to) => supabase.from('savings_buckets').select('id,bucket_type,label,amount').eq('user_id', userId).order('created_at').order('id').range(from, to)),
    readAll<SavingsGoal>((from, to) => supabase.from('savings_goals').select('id,title,target_amount,current_amount,target_date').eq('user_id', userId).order('created_at', { ascending: false }).order('id').range(from, to)),
  ]);
  return {
    preferences: normalizeSavingsPreferences(account.data.user.user_metadata?.savings_preferences),
    buckets: buckets.map((row) => ({ ...row, amount: Number(row.amount) })),
    goals: goals.map((row) => ({ ...row, target_amount: Number(row.target_amount), current_amount: Number(row.current_amount) })),
  };
}

export async function fetchSavingsBucketEntries(userId: string, bucket: SavingsBucketType): Promise<SavingsBucketEntry[]> {
  return (await readAll<SavingsBucketEntry>((from, to) => supabase.from('savings_bucket_entries').select('id,bucket_type,label,amount,date,note')
    .eq('user_id', validateId(userId)).eq('bucket_type', bucket).order('date', { ascending: false }).order('id').range(from, to)))
    .map((entry) => ({ ...entry, amount: Number(entry.amount) }));
}

export async function fetchSavingsContributions(userId: string, goalId: string): Promise<SavingsContribution[]> {
  validateId(userId);
  validateId(goalId);
  return (await readAll<SavingsContribution>((from, to) => supabase.from('savings_contributions').select('id,savings_goal_id,amount,date,note')
    .eq('user_id', userId).eq('savings_goal_id', goalId).order('date', { ascending: false }).order('id').range(from, to)))
    .map((row) => ({ ...row, amount: Number(row.amount) }));
}
