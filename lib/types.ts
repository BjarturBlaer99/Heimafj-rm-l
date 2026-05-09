export type TransactionType = "income" | "expense";
export type CategoryType = "income" | "expense" | "both";
export type SavingsBucketType = "serignarsparnadur" | "husnaedisparnadur" | "hlutabref" | "sjodir";

export type Profile = {
  id: string;
  full_name: string | null;
  currency: string;
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  is_default: boolean;
  created_at: string;
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
  updated_at: string;
  categories?: Pick<Category, "id" | "name" | "type"> | null;
};

export type Budget = {
  id: string;
  user_id: string;
  category_id: string | null;
  month: string;
  amount: number;
  created_at: string;
  updated_at: string;
  categories?: Pick<Category, "id" | "name" | "type"> | null;
};

export type SavingsGoal = {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  created_at: string;
  updated_at: string;
};

export type SavingsContribution = {
  id: string;
  user_id: string;
  savings_goal_id: string;
  amount: number;
  date: string;
  note: string | null;
  created_at: string;
};

export type SavingsBucket = {
  id: string;
  user_id: string;
  bucket_type: SavingsBucketType;
  label: string;
  amount: number;
  created_at: string;
  updated_at: string;
};

export type SavingsBucketEntry = {
  id: string;
  user_id: string;
  bucket_type: SavingsBucketType;
  label: string;
  amount: number;
  date: string;
  note: string | null;
  created_at: string;
};

export type Bill = {
  id: string;
  user_id: string;
  category_id: string | null;
  name: string;
  amount: number;
  due_day: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  categories?: Pick<Category, "id" | "name" | "type"> | null;
};

export type BillPayment = {
  id: string;
  user_id: string;
  bill_id: string;
  transaction_id: string | null;
  month: string;
  amount: number;
  paid_at: string;
  created_at: string;
};

export type BillWithPayment = Bill & {
  payment: BillPayment | null;
};
