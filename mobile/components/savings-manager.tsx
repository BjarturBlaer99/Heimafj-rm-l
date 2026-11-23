import { randomUUID } from 'expo-crypto';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/ui/app-button';
import { AmountField } from '@/components/ui/amount-field';
import { DateField } from '@/components/ui/date-field';
import { ChoiceChips, FormField, FormSheet, InlineNotice } from '@/components/ui/finance-form';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state-view';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useFormAction } from '@/hooks/use-form-action';
import { useRefreshableData } from '@/hooks/use-refreshable-data';
import { addSavingsBucketContribution, deleteSavingsGoal, saveSavingsBucket, saveSavingsGoal } from '@/lib/finance-actions';
import { fetchSavingsBucketEntries } from '@/lib/finance-data';
import { amountFromNumber } from '@/lib/amount-draft';
import { localToday, parseAmount } from '@/lib/finance-validation';
import { formatDate, formatISK } from '@/lib/format';
import { useFeedback } from '@/providers/feedback-provider';
import { SavingsBucketType, SavingsGoal } from '@/types/finance';

export type EditableSavingsBucket = { bucket_type: SavingsBucketType; label: string; amount: number };
export const savingsBucketDefaults: { bucket_type: SavingsBucketType; label: string }[] = [
  { bucket_type: 'serignarsparnadur', label: 'Séreignarsparnaður' },
  { bucket_type: 'husnaedisparnadur', label: 'Húsnæðissparnaður' },
  { bucket_type: 'hlutabref', label: 'Hlutabréf' },
  { bucket_type: 'sjodir', label: 'Sjóðir' },
];
export function SavingsBucketEditor({ userId, bucket, onClose, onSaved }: {
  userId: string; bucket: EditableSavingsBucket; onClose: () => void; onSaved: () => void;
}) {
  const [mode, setMode] = useState('contribution');
  const [label, setLabel] = useState(bucket.label);
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState(amountFromNumber(bucket.amount));
  const [date, setDate] = useState(localToday);
  const [note, setNote] = useState('');
  const [requestId] = useState(randomUUID);
  const action = useFormAction();
  const notify = useFeedback();
  const { colors } = useAppTheme();
  const loadHistory = useCallback(() => mode === 'history' ? fetchSavingsBucketEntries(userId, bucket.bucket_type) : Promise.resolve([]), [mode, userId, bucket.bucket_type]);
  const history = useRefreshableData(loadHistory);
  async function save() {
    if (await action.run(() => mode === 'contribution'
      ? addSavingsBucketContribution(userId, { request_id: requestId, bucket_type: bucket.bucket_type, label: bucket.label, amount: parseAmount(amount), date, note })
      : saveSavingsBucket(userId, { ...bucket, label, amount: parseAmount(balance) }))) {
      onSaved(); notify(mode === 'contribution' ? 'Framlagið var skráð.' : 'Staða sparnaðar var uppfærð.');
    }
  }
  return <FormSheet visible title={bucket.label} subtitle={`Núverandi staða: ${formatISK(bucket.amount)}`} onClose={onClose} busy={action.busy}>
    <ChoiceChips value={mode} onChange={(value) => { setMode(value); action.clearError(); }} disabled={action.busy} options={[{ value: 'contribution', label: 'Skrá framlag' }, { value: 'balance', label: 'Leiðrétta stöðu' }, { value: 'history', label: 'Framlagssaga' }]} />
    {action.error ? <InlineNotice message={action.error} /> : null}
    {mode === 'history' ? history.loading ? <LoadingState /> : history.error ? <ErrorState message={history.error} onRetry={history.retry} /> : history.data?.length ? history.data.map((entry) => <View key={entry.id} style={[styles.historyRow, { borderColor: colors.border }]}>
      <Text style={[styles.amount, { color: colors.text }]}>{formatISK(entry.amount)}</Text><Text style={[styles.body, { color: colors.textSecondary }]}>{formatDate(entry.date)} {entry.date.slice(0, 4)}{entry.note ? ` · ${entry.note}` : ''}</Text>
    </View>) : <EmptyState label="Engin framlög hafa verið skráð í þennan flokk. Leiðréttingar á heildarstöðu teljast ekki framlög." /> : <>
      {mode === 'contribution' ? <>
        <Text style={[styles.body, { color: colors.textSecondary }]}>Framlagið bætist við stöðu flokksins og birtist líka á vefnum.</Text>
        <AmountField label="Framlag (kr.)" value={amount} onChangeText={setAmount} editable={!action.busy} placeholder="0" />
        <DateField label="Dagsetning" value={date} onChange={setDate} disabled={action.busy} />
        <FormField label="Athugasemd (valfrjálst)" value={note} onChangeText={setNote} editable={!action.busy} multiline maxLength={500} />
      </> : <>
        <FormField label="Heiti" value={label} onChangeText={setLabel} maxLength={80} editable={!action.busy} />
        <AmountField label="Núverandi staða (kr.)" value={balance} onChangeText={setBalance} editable={!action.busy} hint="Þessi upphæð kemur í stað heildarstöðunnar. Til að bæta peningum við velurðu Skrá framlag." />
      </>}
      <AppButton label={mode === 'contribution' ? 'Skrá framlag' : 'Vista stöðu'} loading={action.busy} onPress={save} />
    </>}
  </FormSheet>;
}
export function SavingsGoalEditor({ userId, goal, currentAmount, onClose, onChanged }: {
  userId: string; goal: SavingsGoal | null; currentAmount: number; onClose: () => void; onChanged: () => void;
}) {
  const { colors } = useAppTheme();
  const [title, setTitle] = useState(goal?.title ?? '');
  const [target, setTarget] = useState(amountFromNumber(goal?.target_amount));
  const [targetDate, setTargetDate] = useState(goal?.target_date ?? '');
  const [requestId] = useState(randomUUID);
  const [removing, setRemoving] = useState(false);
  const action = useFormAction();
  const notify = useFeedback();
  async function save() {
    if (await action.run(() => saveSavingsGoal(userId, { id: goal?.id, request_id: requestId, title, target_amount: parseAmount(target), current_amount: currentAmount, target_date: targetDate || null }))) {
      onChanged(); onClose(); notify(goal ? 'Markmiðið var uppfært.' : 'Markmiðið var skráð.');
    }
  }
  return <FormSheet visible title={goal ? 'Breyta markmiði' : 'Nýtt sparnaðarmarkmið'} onClose={onClose} busy={action.busy}>
    {action.error ? <InlineNotice message={action.error} /> : null}
    {removing && goal ? <>
      <Text style={[styles.body, { color: colors.text }]}>Eyða „{goal.title}“? Eldri framlög sem voru skráð beint á markmiðið eyðast líka. Staða sparnaðarflokkanna helst óbreytt.</Text>
      <AppButton label="Já, eyða markmiði" variant="danger" loading={action.busy} onPress={async () => { if (await action.run(() => deleteSavingsGoal(userId, goal.id))) { onChanged(); onClose(); notify('Markmiðinu var eytt.'); } }} />
      <AppButton label="Hætta við" variant="secondary" disabled={action.busy} onPress={() => setRemoving(false)} />
    </> : <>
      <FormField label="Heiti markmiðs" value={title} onChangeText={setTitle} editable={!action.busy} maxLength={80} placeholder="Til dæmis útborgun í íbúð" />
      <AmountField label="Markupphæð (kr.)" value={target} onChangeText={setTarget} editable={!action.busy} placeholder="0" />
      <Text style={[styles.amount, { color: colors.text }]}>{formatISK(currentAmount)} komið</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>Staðan er samtala flokkanna sem þú velur í Skiptingu sparnaðar, eins og á vefnum. Skráðu ný framlög í viðeigandi sparnaðarflokk.</Text>
      <DateField label="Markdagsetning (valfrjálst)" value={targetDate} onChange={setTargetDate} disabled={action.busy} optional />
      <AppButton label={goal ? 'Vista markmið' : 'Búa til markmið'} loading={action.busy} onPress={save} />
      {goal ? <AppButton label="Eyða markmiði" variant="danger" disabled={action.busy} onPress={() => setRemoving(true)} /> : null}
    </>}
  </FormSheet>;
}
const styles = StyleSheet.create({ body: { fontSize: 14, lineHeight: 21 }, amount: { fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] }, historyRow: { paddingVertical: 12, gap: 6, borderBottomWidth: StyleSheet.hairlineWidth } });
