import { supabase } from '@/lib/supabase';
import { financeError, validateId } from '@/lib/finance-validation';
import { normalizeSavingsPreferences } from '@/lib/savings-preferences';

export function deletionRequestedAt(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const request = value as Record<string, unknown>;
  if (request.status !== 'requested' || typeof request.requested_at !== 'string') return null;
  return Number.isFinite(Date.parse(request.requested_at)) ? new Date(request.requested_at).toISOString() : null;
}
async function account(userId: string) {
  const result = await supabase.auth.getUser();
  if (result.error || result.data.user?.id !== validateId(userId)) throw new Error('Skráðu þig aftur inn til að halda áfram.');
  return result.data.user;
}
export async function setDeletionRequest(userId: string, confirmation: string | null) {
  const user = await account(userId);
  if (confirmation !== null && confirmation.trim().toUpperCase() !== 'EYÐA') throw new Error('Skrifaðu EYÐA til að staðfesta beiðnina.');
  if (confirmation !== null && deletionRequestedAt(user.user_metadata?.account_deletion_request)) return;
  const { error } = await supabase.auth.updateUser({ data: { account_deletion_request: confirmation === null ? null : { status: 'requested', requested_at: new Date().toISOString() } } });
  if (error) throw financeError(error, 'Ekki tókst að vista beiðnina. Reyndu aftur.');
}
const exportTables = ['profiles', 'categories', 'transactions', 'budgets', 'bills', 'bill_payments', 'savings_buckets', 'savings_bucket_entries', 'savings_goals', 'savings_contributions'] as const;
export async function exportAccountData(userId: string) {
  const user = await account(userId);
  const results = await Promise.allSettled(exportTables.map(async (table) => {
    const rows: Record<string, unknown>[] = [];
    while (true) {
      const result = await supabase.from(table).select('*').eq(table === 'profiles' ? 'id' : 'user_id', userId).order('id').range(rows.length, rows.length + 499);
      if (result.error) throw financeError(result.error, 'Ekki tókst að sækja öll gögnin. Engin skrá var flutt út. Reyndu aftur.');
      if (!result.data?.length) break;
      rows.push(...result.data);
    }
    return [table, rows] as const;
  }));
  const failure = results.find((result) => result.status === 'rejected');
  if (failure?.status === 'rejected') throw failure.reason;
  const entries = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
  await account(userId); // Never share a prior account's result after sign-out.
  return {
    version: 1, exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: user.created_at,
      savings_preferences: normalizeSavingsPreferences(user.user_metadata?.savings_preferences),
      account_deletion_request: deletionRequestedAt(user.user_metadata?.account_deletion_request) },
    data: Object.fromEntries(entries),
  };
}
