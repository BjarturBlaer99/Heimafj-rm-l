export type TransactionType = 'income' | 'expense';

export type Category = {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
};

export type Transaction = {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  type: TransactionType;
  date: string;
  note: string | null;
  created_at: string;
  categories: Pick<Category, 'id' | 'name' | 'type'> | null;
};

export type Profile = {
  id: string;
  full_name: string | null;
  currency: string;
};

export type Bill = {
  id: string;
  user_id: string;
  series_id: string;
  category_id: string | null;
  month: string;
  name: string;
  amount: number;
  due_day: number;
  is_active: boolean;
};

export type BillPayment = {
  id: string;
  bill_id: string;
  transaction_id: string | null;
  month: string;
  amount: number;
  paid_at: string;
};

export type BillWithPayment = Bill & {
  payment: BillPayment | null;
};

export const savingsBucketTypes = ['serignarsparnadur', 'husnaedisparnadur', 'hlutabref', 'sjodir'] as const;
export type SavingsBucketType = (typeof savingsBucketTypes)[number];

export type SavingsBucket = {
  id: string;
  bucket_type: SavingsBucketType;
  label: string;
  amount: number;
};

export type SavingsGoal = {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
};

export type SavingsContribution = {
  id: string;
  savings_goal_id: string;
  amount: number;
  date: string;
  note: string | null;
};

export type SavingsBucketEntry = { id: string; bucket_type: SavingsBucketType; label: string; amount: number; date: string; note: string | null };

export type TransactionPage = {
  items: Transaction[];
  hasMore: boolean;
  income: number;
  expenses: number;
};

export type MonthlyTrendPoint = {
  key: string;
  label: string;
  income: number;
  expense: number;
};

export type DashboardSnapshot = {
  profile: Profile | null;
  monthKey: string;
  income: number;
  expenses: number;
  balance: number;
  savings: number;
  recentTransactions: Transaction[];
  trend: MonthlyTrendPoint[];
};
