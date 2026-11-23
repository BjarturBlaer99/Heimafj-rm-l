import * as Crypto from 'expo-crypto';

import { emitFinanceChange } from '@/lib/finance-events';
import { financeError, validateAmount, validateDate, validateId, validateMonth, validateNote, validateText } from '@/lib/finance-validation';
import { supabase } from '@/lib/supabase';
import { validSavingsPreferences, type SavingsPreferences } from '@/lib/savings-preferences';
import { savingsBucketTypes, type Bill, type BillPayment, type BillWithPayment, type SavingsBucketType, type TransactionType } from '@/types/finance';

type Result = { error: { code?: string } | null };
type NewRequest = { request_id?: string };
const billOperations = new Map<string, { kind: string; pending: Promise<void> }>();
const unresolvedPayment = 'Ekki tókst að staðfesta alla greiðsluna. Uppfærðu og reyndu aftur; sama greiðsla verður ekki tvískráð.';

function checked(result: Result) {
  if (result.error) throw financeError(result.error);
}

async function billOperation(userId: string, billId: string, kind: string, action: () => Promise<void>): Promise<void> {
  const key = `${validateId(userId)}:${validateId(billId)}`;
  const existing = billOperations.get(key);
  if (existing) {
    if (existing.kind !== kind) throw new Error('Önnur aðgerð á þessum reikningi er í gangi. Bíddu augnablik.');
    return existing.pending;
  }
  const pending = action().finally(() => { billOperations.delete(key); });
  billOperations.set(key, { kind, pending });
  return pending;
}

async function insertOnce(table: string, userId: string, payload: Record<string, unknown>, requestId?: string) {
  const id = requestId ? validateId(requestId) : Crypto.randomUUID();
  const result = await supabase.from(table).insert({ ...payload, id, user_id: validateId(userId) });
  if (!result.error) return;
  // Reconcile a lost response or retried draft, never overwrite an existing row.
  const existing = await supabase.from(table).select('*').eq('user_id', userId).eq('id', id).maybeSingle();
  if (!existing.error && existing.data && Object.entries(payload).every(([key, value]) => {
    if (table === 'savings_goals' && key === 'current_amount') return true;
    return typeof value === 'number' ? Number(existing.data[key]) === value : String(existing.data[key] ?? '') === String(value ?? '');
  })) return;
  throw financeError(result.error);
}

async function ownedCategory(userId: string, categoryId: string | null, type: TransactionType) {
  if (!categoryId) return null;
  const result = await supabase.from('categories').select('id,type').eq('user_id', userId).eq('id', validateId(categoryId)).maybeSingle();
  checked(result);
  if (!result.data || (result.data.type !== 'both' && result.data.type !== type)) throw new Error('Veldu flokk sem passar við tegund færslunnar.');
  return categoryId;
}

async function assertNotBillExpense(userId: string, transactionId: string) {
  const result = await supabase.from('bill_payments').select('id').eq('user_id', userId).eq('transaction_id', transactionId).limit(1);
  checked(result);
  if (result.data?.length) throw new Error('Breyttu greiðslunni í Reikningum.');
}

export async function saveTransaction(userId: string, input: NewRequest & { id?: string; category_id: string | null; amount: number; type: TransactionType; date: string; note?: string | null }): Promise<void> {
  validateId(userId);
  if (!['income', 'expense'].includes(input.type)) throw new Error('Veldu tekjur eða útgjöld.');
  const payload = { category_id: await ownedCategory(userId, input.category_id, input.type), amount: validateAmount(input.amount), type: input.type, date: validateDate(input.date), note: validateNote(input.note) };
  if (input.id) {
    validateId(input.id);
    await assertNotBillExpense(userId, input.id);
    const result = await supabase.from('transactions').update(payload).eq('user_id', userId).eq('id', input.id).select('id').maybeSingle();
    checked(result);
    if (!result.data) throw new Error('Færslan fannst ekki. Uppfærðu síðuna.');
  } else await insertOnce('transactions', userId, payload, input.request_id);
  emitFinanceChange();
}

export async function deleteTransaction(userId: string, id: string): Promise<void> {
  validateId(userId); validateId(id);
  await assertNotBillExpense(userId, id);
  checked(await supabase.from('transactions').delete().eq('user_id', userId).eq('id', id));
  emitFinanceChange();
}

async function paymentForBill(userId: string, billId: string): Promise<BillPayment | null> {
  const result = await supabase.from('bill_payments').select('id,bill_id,transaction_id,month,amount,paid_at').eq('user_id', userId).eq('bill_id', billId).maybeSingle();
  checked(result);
  return result.data ? { ...result.data, amount: Number(result.data.amount) } as BillPayment : null;
}

async function assertBillUnpaid(userId: string, billId: string) {
  if (await paymentForBill(userId, billId)) throw new Error('Afturkallaðu greiðsluna áður en þú breytir eða eyðir reikningnum.');
  const pending = await supabase.from('transactions').select('id').eq('user_id', userId).eq('id', await billTransactionId(userId, billId)).maybeSingle();
  checked(pending);
  if (pending.data) throw new Error('Greiðsla þessa reiknings er óstaðfest. Reyndu að staðfesta greiðsluna aftur áður en þú breytir eða eyðir honum.');
}

export async function saveBill(userId: string, input: NewRequest & { id?: string; name: string; amount: number; due_day: number; category_id: string | null; month: string; is_active: boolean }): Promise<void> {
  validateId(userId);
  const month = `${validateMonth(input.month)}-01`;
  if (!Number.isInteger(input.due_day) || input.due_day < 1 || input.due_day > 31) throw new Error('Gjalddagi þarf að vera á bilinu 1–31.');
  if (typeof input.is_active !== 'boolean') throw new Error('Veldu hvort reikningurinn sé virkur.');
  const payload = { name: validateText(input.name, 'Heiti', 80, 2), amount: validateAmount(input.amount), due_day: input.due_day, category_id: await ownedCategory(userId, input.category_id, 'expense'), is_active: input.is_active, month };
  if (input.id) {
    validateId(input.id);
    await billOperation(userId, input.id, 'edit', async () => {
      await assertBillUnpaid(userId, input.id!);
      const result = await supabase.from('bills').update(payload).eq('user_id', userId).eq('id', input.id!).eq('month', month).select('id').maybeSingle();
      checked(result);
      if (!result.data) throw new Error('Reikningurinn fannst ekki í völdum mánuði.');
    });
  } else {
    let query = supabase.from('bills').select('series_id').eq('user_id', userId).eq('name', payload.name).order('month', { ascending: false }).limit(1);
    query = payload.category_id ? query.eq('category_id', payload.category_id) : query.is('category_id', null);
    const existing = await query.maybeSingle();
    checked(existing);
    await insertOnce('bills', userId, { ...payload, ...(existing.data?.series_id ? { series_id: existing.data.series_id } : {}) }, input.request_id);
  }
  emitFinanceChange();
}

export async function deleteBill(userId: string, id: string): Promise<void> {
  await billOperation(userId, id, 'delete', async () => {
    await assertBillUnpaid(userId, id);
    checked(await supabase.from('bills').delete().eq('user_id', userId).eq('id', id));
    emitFinanceChange();
  });
}

async function billTransactionId(userId: string, billId: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `min-fjarmal:bill-payment:v1:${userId}:${billId}`);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-8${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export async function markBillPaid(userId: string, bill: BillWithPayment): Promise<void> {
  await billOperation(userId, bill.id, 'pay', async () => {
    if (await paymentForBill(userId, bill.id)) { emitFinanceChange(); return; }
    const fresh = await supabase.from('bills').select('id,user_id,series_id,category_id,month,name,amount,due_day,is_active').eq('user_id', userId).eq('id', bill.id).maybeSingle();
    checked(fresh);
    const current = fresh.data as Bill | null;
    if (!current || !current.is_active) throw new Error('Reikningurinn fannst ekki eða er óvirkur.');
    if (Number(current.amount) !== Number(bill.amount) || current.category_id !== bill.category_id || current.name !== bill.name || Number(current.due_day) !== Number(bill.due_day) || current.month !== bill.month) {
      throw new Error('Reikningnum var breytt. Uppfærðu síðuna og staðfestu nýju upplýsingarnar.');
    }
    const month = validateMonth(current.month.slice(0, 7));
    const [year, monthNumber] = month.split('-').map(Number);
    const lastDay = new Date(0);
    lastDay.setUTCFullYear(year, monthNumber, 0);
    const paidDate = validateDate(`${month}-${String(Math.min(current.due_day, lastDay.getUTCDate())).padStart(2, '0')}`);
    const id = await billTransactionId(userId, current.id);
    const readExpense = () => supabase.from('transactions').select('id,amount,date,type,category_id,note').eq('user_id', userId).eq('id', id).maybeSingle();
    let expense = await readExpense();
    checked(expense);
    if (!expense.data) {
      const inserted = await supabase.from('transactions').insert({ id, user_id: userId, category_id: current.category_id, amount: validateAmount(Number(current.amount)), type: 'expense', date: paidDate, note: current.name });
      expense = await readExpense();
      if (expense.error || !expense.data) throw new Error(inserted.error ? unresolvedPayment : 'Ekki tókst að staðfesta greiðsluna. Reyndu aftur.');
    }
    if (expense.data.type !== 'expense' || Number(expense.data.amount) !== Number(current.amount) || expense.data.date !== paidDate || expense.data.category_id !== current.category_id || expense.data.note !== current.name) throw new Error(unresolvedPayment);
    const result = await supabase.from('bill_payments').insert({ user_id: userId, bill_id: current.id, transaction_id: id, month: current.month, amount: Number(expense.data.amount), paid_at: expense.data.date });
    if (result.error) {
      let payment: BillPayment | null;
      try { payment = await paymentForBill(userId, current.id); } catch { throw new Error(unresolvedPayment); }
      if (payment?.transaction_id === id) { emitFinanceChange(); return; }
      // A competing payment has its own linked expense. Remove only our known
      // expense, or compensate an explicit database rejection. A lost response
      // without a database error code is ambiguous: retain its deterministic ID
      // and make the next retry reconcile it instead of creating another one.
      if (payment || result.error.code) {
        const cleanup = await supabase.from('transactions').delete().eq('user_id', userId).eq('id', id);
        if (cleanup.error) throw new Error(unresolvedPayment);
        emitFinanceChange();
        if (payment) return;
        throw financeError(result.error);
      }
      throw new Error(unresolvedPayment);
    }
    emitFinanceChange();
  });
}

export async function deleteBillPayment(userId: string, payment: BillPayment): Promise<void> {
  validateId(payment.id);
  await billOperation(userId, payment.bill_id, 'unpay', async () => {
    const result = await supabase.from('bill_payments').select('id,transaction_id').eq('user_id', userId).eq('id', payment.id).maybeSingle();
    checked(result);
    if (result.data) {
      // The database refuses to delete an expense while a payment links it,
      // so the payment is removed first.
      const removed = await supabase.from('bill_payments').delete().eq('user_id', userId).eq('id', payment.id);
      if (removed.error) throw financeError(removed.error, 'Ekki tókst að afturkalla greiðsluna. Reyndu aftur.');
    } else if (await paymentForBill(userId, payment.bill_id)) {
      // The bill was paid again elsewhere; this screen was out of date.
      emitFinanceChange();
      return;
    }
    // Only the expense this app generated for the payment is removed. An
    // existing expense linked on the website (e.g. imported from a bank file)
    // is kept, matching the website's unlink behaviour. Retrying after an
    // interrupted undo also lands here and finishes the cleanup.
    const cleanup = await supabase.from('transactions').delete().eq('user_id', userId).eq('id', await billTransactionId(userId, payment.bill_id));
    emitFinanceChange();
    if (cleanup.error) throw new Error('Greiðslan var afturkölluð en útgjaldafærsla hennar er enn skráð. Eyddu henni undir Færslur ef hún á ekki að standa.');
  });
}

export async function saveSavingsBucket(userId: string, input: { bucket_type: SavingsBucketType; label: string; amount: number }): Promise<void> {
  validateId(userId);
  if (!savingsBucketTypes.includes(input.bucket_type)) throw new Error('Veldu gildan sparnaðarflokk.');
  checked(await supabase.from('savings_buckets').upsert({ user_id: userId, bucket_type: input.bucket_type, label: validateText(input.label, 'Heiti', 80, 2), amount: validateAmount(input.amount, true) }, { onConflict: 'user_id,bucket_type' }));
  emitFinanceChange();
}

export async function saveSavingsPreferences(userId: string, preferences: SavingsPreferences): Promise<void> {
  if (!validSavingsPreferences(preferences)) throw new Error('Skipting sparnaðar er ekki gild. Opnaðu stillingarnar aftur.');
  const account = await supabase.auth.getUser();
  if (account.error || account.data.user?.id !== validateId(userId)) throw new Error('Skráðu þig aftur inn til að vista stillingarnar.');
  checked(await supabase.auth.updateUser({ data: { savings_preferences: preferences } }));
  emitFinanceChange();
}

export async function addSavingsBucketContribution(userId: string, input: { request_id: string; bucket_type: SavingsBucketType; label: string; amount: number; date: string; note?: string }): Promise<void> {
  if (!savingsBucketTypes.includes(input.bucket_type)) throw new Error('Veldu gildan sparnaðarflokk.');
  const account = await supabase.auth.getUser();
  if (account.error || account.data.user?.id !== validateId(userId)) throw new Error('Skráðu þig aftur inn til að skrá framlag.');
  const result = await supabase.rpc('add_savings_bucket_contribution', {
    p_request_id: validateId(input.request_id), p_bucket_type: input.bucket_type,
    p_amount: validateAmount(input.amount), p_date: validateDate(input.date),
    p_note: validateNote(input.note), p_label: validateText(input.label, 'Heiti', 80, 2),
  });
  if (result.error?.code === 'PGRST202' || result.error?.code === '42883') throw new Error('Framlög eru ekki tilbúin í þessari útgáfu gagnagrunnsins. Hafðu samband við aðstoð.');
  checked(result);
  emitFinanceChange();
}

export async function saveSavingsGoal(userId: string, input: NewRequest & { id?: string; title: string; target_amount: number; current_amount: number; target_date?: string | null }): Promise<void> {
  validateId(userId);
  validateAmount(input.current_amount, true);
  const payload = { title: validateText(input.title, 'Heiti', 80, 2), target_amount: validateAmount(input.target_amount), target_date: input.target_date ? validateDate(input.target_date) : null };
  if (input.id) {
    const result = await supabase.from('savings_goals').update(payload).eq('user_id', userId).eq('id', validateId(input.id)).select('id').maybeSingle();
    checked(result);
    if (!result.data) throw new Error('Markmiðið fannst ekki. Uppfærðu síðuna.');
  } else await insertOnce('savings_goals', userId, { ...payload, current_amount: validateAmount(input.current_amount, true) }, input.request_id);
  emitFinanceChange();
}

export async function deleteSavingsGoal(userId: string, id: string): Promise<void> {
  checked(await supabase.from('savings_goals').delete().eq('user_id', validateId(userId)).eq('id', validateId(id)));
  emitFinanceChange();
}

export async function addSavingsContribution(userId: string, input: NewRequest & { savings_goal_id: string; amount: number; date: string; note?: string | null }): Promise<void> {
  validateId(userId);
  const goalId = validateId(input.savings_goal_id);
  const goal = await supabase.from('savings_goals').select('id').eq('user_id', userId).eq('id', goalId).maybeSingle();
  checked(goal);
  if (!goal.data) throw new Error('Markmiðið fannst ekki. Uppfærðu síðuna.');
  // The database trigger updates current_amount; never add it a second time.
  await insertOnce('savings_contributions', userId, { savings_goal_id: goalId, amount: validateAmount(input.amount), date: validateDate(input.date), note: validateNote(input.note) }, input.request_id);
  emitFinanceChange();
}

export async function deleteSavingsContribution(userId: string, id: string): Promise<void> {
  checked(await supabase.from('savings_contributions').delete().eq('user_id', validateId(userId)).eq('id', validateId(id)));
  emitFinanceChange();
}

export async function saveProfile(userId: string, fullName: string): Promise<void> {
  const result = await supabase.from('profiles').update({ full_name: validateText(fullName, 'Nafn', 80, 2) }).eq('id', validateId(userId)).select('id').maybeSingle();
  checked(result);
  if (!result.data) throw new Error('Aðgangsupplýsingar fundust ekki. Reyndu aftur síðar.');
  emitFinanceChange();
}
