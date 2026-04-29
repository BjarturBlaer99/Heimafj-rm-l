import { z } from "zod";

export const authSchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(8).max(100),
  fullName: z.string().trim().min(2).max(80).optional()
});

export const transactionSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid().nullable().optional(),
  amount: z.coerce.number().positive(),
  type: z.enum(["income", "expense"]),
  date: z.string().min(10).max(10),
  note: z.string().trim().max(500).nullable().optional()
});

export const importTransactionSchema = z.object({
  category_id: z.string().uuid().nullable().optional(),
  amount: z.coerce.number().positive(),
  type: z.enum(["income", "expense"]),
  date: z.string().min(10).max(10),
  note: z.string().trim().max(500).nullable().optional()
});

export const importTransactionsSchema = z.array(importTransactionSchema).min(1).max(500);

export const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(60),
  type: z.enum(["income", "expense", "both"])
});

export const budgetSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.preprocess((value) => (value === "" ? null : value), z.string().uuid().nullable().optional()),
  month: z.string().regex(/^\d{4}-\d{2}$/).transform((value) => `${value}-01`),
  amount: z.coerce.number().positive()
});

export const monthlyIncomeSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid().nullable().optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).transform((value) => `${value}-01`),
  amount: z.coerce.number().positive(),
  note: z.string().trim().max(500).nullable().optional()
});

export const savingsGoalSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(80),
  target_amount: z.coerce.number().positive(),
  current_amount: z.coerce.number().min(0).default(0),
  target_date: z.preprocess((value) => (value === "" ? null : value), z.string().min(10).max(10).nullable().optional())
});

export const savingsContributionSchema = z.object({
  savings_goal_id: z.string().uuid(),
  amount: z.coerce.number().positive(),
  date: z.string().min(10).max(10),
  note: z.string().trim().max(500).nullable().optional()
});

export const savingsBucketSchema = z.object({
  bucket_type: z.enum(["serignarsparnadur", "husnaedisparnadur", "hlutabref", "sjodir"]),
  label: z.string().trim().min(1).max(80),
  amount: z.coerce.number().min(0)
});

export const profileSchema = z.object({
  full_name: z.string().trim().min(1).max(80),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase())
});
