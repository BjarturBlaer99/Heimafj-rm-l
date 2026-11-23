import { randomUUID } from 'expo-crypto';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AmountField } from '@/components/ui/amount-field';
import { DateField } from '@/components/ui/date-field';
import { amountFromNumber } from '@/lib/amount-draft';
import { useFeedback } from '@/providers/feedback-provider';
import { ChoiceChips, FormField, FormSheet, InlineNotice } from '@/components/ui/finance-form';
import { useFormAction } from '@/hooks/use-form-action';
import { useRefreshableData } from '@/hooks/use-refreshable-data';
import { deleteTransaction, saveTransaction } from '@/lib/finance-actions';
import { fetchCategories } from '@/lib/finance-data';
import { localToday, parseAmount } from '@/lib/finance-validation';
import type { Transaction, TransactionType } from '@/types/finance';

export function TransactionEditor({ transaction, userId, onClose, onSaved }: {
  transaction?: Transaction; userId: string; onClose: () => void; onSaved: (message: string, month?: string) => void;
}) {
  const [requestId] = useState(randomUUID);
  const [type, setType] = useState<TransactionType>(transaction?.type ?? 'expense');
  const [amount, setAmount] = useState(amountFromNumber(transaction?.amount));
  const notify = useFeedback();
  const [date, setDate] = useState(transaction?.date ?? localToday());
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? '');
  const [note, setNote] = useState(transaction?.note ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { busy, error, run } = useFormAction();
  const loadCategories = useCallback(() => fetchCategories(userId), [userId]);
  const categories = useRefreshableData(loadCategories);

  async function save() {
    const success = await run(async () => { await saveTransaction(userId, { id: transaction?.id, request_id: requestId, type, amount: parseAmount(amount), date: date.trim(), category_id: categoryId || null, note: note.trim() || null }); });
    if (success) { const message = transaction ? 'Færslan var uppfærð.' : 'Færslan var skráð.'; onSaved(message, date.trim().slice(0, 7)); notify(message); }
  }

  async function remove() {
    if (!transaction) return;
    const success = await run(async () => { await deleteTransaction(userId, transaction.id); });
    if (success) { onSaved('Færslunni var eytt.'); notify('Færslunni var eytt.'); }
  }

  return (
    <FormSheet visible title={transaction ? 'Breyta færslu' : 'Ný færsla'} subtitle="Uppfærir yfirlitið þitt um leið og þú vistar." onClose={onClose} busy={busy}>
      <ChoiceChips label="Tegund" value={type} disabled={busy} options={[{ value: 'expense', label: 'Útgjöld' }, { value: 'income', label: 'Tekjur' }]} onChange={(next) => { setType(next as TransactionType); setCategoryId(''); }} />
      <AmountField label="Upphæð (kr.)" hint="Notaðu kommu fyrir aukastafi, til dæmis 12.500,50." value={amount} onChangeText={setAmount} placeholder="0" editable={!busy} />
      <DateField label="Dagsetning" value={date} onChange={setDate} disabled={busy} />
      <ChoiceChips label="Flokkur" value={categoryId} disabled={busy || categories.loading} onChange={setCategoryId} options={[{ value: '', label: 'Óflokkað' }, ...(categories.data ?? []).filter((category) => category.type === 'both' || category.type === type).map((category) => ({ value: category.id, label: category.name }))]} />
      {categories.error ? <View style={{ gap: 8 }}><InlineNotice message="Ekki tókst að sækja flokka. Þú getur samt vistað án flokks." /><AppButton label="Sækja flokka aftur" variant="secondary" onPress={categories.retry} /></View> : null}
      <FormField label="Lýsing" hint="Valfrjálst" value={note} onChangeText={setNote} placeholder="Til dæmis matvörur" maxLength={500} editable={!busy} multiline />
      {error ? <InlineNotice message={error} /> : null}
      {confirmDelete ? <View style={{ gap: 12 }}>
        <InlineNotice message="Eyða þessari færslu? Ekki er hægt að afturkalla eyðinguna." />
        <AppButton label="Já, eyða færslu" variant="danger" loading={busy} onPress={() => void remove()} />
        <AppButton label="Hætta við eyðingu" variant="secondary" disabled={busy} onPress={() => setConfirmDelete(false)} />
      </View> : <>
        <AppButton label="Vista færslu" loading={busy} onPress={() => void save()} />
        {transaction ? <AppButton label="Eyða færslu" variant="danger" disabled={busy} onPress={() => setConfirmDelete(true)} /> : null}
      </>}
    </FormSheet>
  );
}
