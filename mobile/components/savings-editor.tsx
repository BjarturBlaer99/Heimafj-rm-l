import * as Crypto from 'expo-crypto';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { ChoiceChips, FormField, FormSheet, InlineNotice } from '@/components/ui/finance-form';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state-view';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useFormAction } from '@/hooks/use-form-action';
import { useRefreshableData } from '@/hooks/use-refreshable-data';
import { addSavingsContribution, deleteSavingsContribution, deleteSavingsGoal, saveSavingsBucket, saveSavingsGoal } from '@/lib/finance-actions';
import { fetchSavingsContributions } from '@/lib/finance-data';
import { localToday, parseAmount } from '@/lib/finance-validation';
import { formatDate, formatISK } from '@/lib/format';
import { SavingsBucketType, SavingsContribution, SavingsGoal } from '@/types/finance';

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
  const [label, setLabel] = useState(bucket.label);
  const [amount, setAmount] = useState(String(bucket.amount));
  const { busy, error, run } = useFormAction();
  async function save() {
    const saved = await run(async () => {
      if (!label.trim()) throw new Error('Skrifaðu heiti sparnaðarflokks.');
      await saveSavingsBucket(userId, { ...bucket, label: label.trim(), amount: parseAmount(amount) });
    });
    if (saved) onSaved();
  }
  return (
    <FormSheet visible title="Uppfæra sparnað" subtitle={bucket.label} onClose={onClose} busy={busy}>
      {error ? <InlineNotice message={error} /> : null}
      <FormField label="Heiti" value={label} onChangeText={setLabel} maxLength={80} editable={!busy} />
      <FormField label="Núverandi staða (kr.)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" editable={!busy} hint="Skráðu heildarstöðu flokksins. Upphæðin kemur í stað fyrri stöðu." />
      <AppButton label="Vista stöðu" loading={busy} onPress={save} />
    </FormSheet>
  );
}

export function SavingsGoalEditor({ userId, goal, onClose, onChanged }: {
  userId: string; goal: SavingsGoal | null; onClose: () => void; onChanged: () => void;
}) {
  const { colors } = useAppTheme();
  const [tab, setTab] = useState('details');
  const [title, setTitle] = useState(goal?.title ?? '');
  const [target, setTarget] = useState(String(goal?.target_amount ?? ''));
  const [initial, setInitial] = useState(String(goal?.current_amount ?? 0));
  const [targetDate, setTargetDate] = useState(goal?.target_date ?? '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(localToday);
  const [note, setNote] = useState('');
  const [goalRequestId] = useState(() => Crypto.randomUUID());
  const [contributionRequestId] = useState(() => Crypto.randomUUID());
  const [deleteGoal, setDeleteGoal] = useState(false);
  const [deleteContribution, setDeleteContribution] = useState<SavingsContribution | null>(null);
  const { busy, error, clearError, run } = useFormAction();
  const goalId = goal?.id;
  const loadContributions = useCallback(() => goalId ? fetchSavingsContributions(userId, goalId) : Promise.resolve([]), [goalId, userId]);
  const history = useRefreshableData(loadContributions);

  function changeTab(value: string) {
    clearError();
    setTab(value);
  }

  async function saveGoal() {
    const saved = await run(async () => {
      if (!title.trim()) throw new Error('Skrifaðu heiti markmiðs.');
      await saveSavingsGoal(userId, {
        id: goal?.id,
        request_id: goalRequestId,
        title: title.trim(),
        target_amount: parseAmount(target),
        current_amount: goal ? goal.current_amount : parseAmount(initial),
        target_date: targetDate.trim() || null,
      });
    });
    if (saved) { onChanged(); onClose(); }
  }

  async function contribute() {
    if (!goal) return;
    const saved = await run(async () => {
      await addSavingsContribution(userId, { request_id: contributionRequestId, savings_goal_id: goal.id, amount: parseAmount(amount), date, note: note.trim() || null });
    });
    if (saved) { onChanged(); onClose(); }
  }

  async function removeGoal() {
    if (!goal) return;
    const saved = await run(() => deleteSavingsGoal(userId, goal.id));
    if (saved) { onChanged(); onClose(); }
  }

  async function removeContribution() {
    if (!deleteContribution) return;
    const saved = await run(() => deleteSavingsContribution(userId, deleteContribution.id));
    if (saved) {
      setDeleteContribution(null);
      onChanged();
      void history.refresh();
    }
  }

  return (
    <FormSheet visible title={goal ? goal.title : 'Nýtt sparnaðarmarkmið'} onClose={onClose} busy={busy}>
      {error ? <InlineNotice message={error} /> : null}
      {deleteGoal || deleteContribution ? (
        <>
          <Text style={[styles.confirmTitle, { color: colors.text }]}>{deleteGoal ? 'Eyða markmiði?' : 'Eyða framlagi?'}</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {deleteGoal ? `„${goal?.title}“ og öll skráð framlög þess verða fjarlægð. Staða sparnaðarflokka breytist ekki.` : `Framlagið að upphæð ${formatISK(deleteContribution?.amount ?? 0)} verður fjarlægt og staða markmiðsins lækkar sem því nemur.`}
          </Text>
          <AppButton label={deleteGoal ? 'Eyða markmiði' : 'Eyða framlagi'} variant="danger" loading={busy} onPress={deleteGoal ? removeGoal : removeContribution} />
          <AppButton label="Hætta við" variant="secondary" disabled={busy} onPress={() => { clearError(); setDeleteGoal(false); setDeleteContribution(null); }} />
        </>
      ) : (
        <>
          {goal ? <ChoiceChips value={tab} onChange={changeTab} disabled={busy} options={[{ value: 'details', label: 'Markmið' }, { value: 'contribute', label: 'Bæta við' }, { value: 'history', label: 'Framlög' }]} /> : null}
          {tab === 'details' ? (
            <>
              <FormField label="Heiti markmiðs" value={title} onChangeText={setTitle} editable={!busy} maxLength={80} placeholder="Til dæmis ferðasjóður" />
              <FormField label="Markupphæð (kr.)" value={target} onChangeText={setTarget} editable={!busy} keyboardType="decimal-pad" placeholder="0" />
              {goal ? (
                <View style={styles.balance}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Núverandi staða</Text>
                  <Text style={[styles.balanceValue, { color: colors.text }]}>{formatISK(goal.current_amount)}</Text>
                  <Text style={[styles.hint, { color: colors.textSecondary }]}>Bættu við framlagi eða breyttu framlagssögu til að uppfæra stöðuna.</Text>
                </View>
              ) : <FormField label="Upphafsstaða (kr.)" value={initial} onChangeText={setInitial} editable={!busy} keyboardType="decimal-pad" hint="Það sem þú átt þegar til fyrir þessu markmiði." />}
              <FormField label="Markdagsetning (valfrjálst)" value={targetDate} onChangeText={setTargetDate} editable={!busy} placeholder="ÁÁÁÁ-MM-DD" autoCapitalize="none" autoCorrect={false} maxLength={10} hint="Til dæmis 2027-06-01. Skildu eftir autt ef enginn dagur er ákveðinn." />
              <AppButton label={goal ? 'Vista markmið' : 'Búa til markmið'} loading={busy} onPress={saveGoal} />
              {goal ? <AppButton label="Eyða markmiði" variant="danger" disabled={busy} onPress={() => { clearError(); setDeleteGoal(true); }} /> : null}
            </>
          ) : tab === 'contribute' ? (
            <>
              <Text style={[styles.body, { color: colors.textSecondary }]}>Skráðu upphæð sem þú hefur lagt til hliðar fyrir þetta markmið. Framlagið bætist við stöðu markmiðsins.</Text>
              <FormField label="Framlag (kr.)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" editable={!busy} placeholder="0" />
              <FormField label="Dagsetning" value={date} onChangeText={setDate} editable={!busy} autoCorrect={false} autoCapitalize="none" placeholder="ÁÁÁÁ-MM-DD" maxLength={10} hint="Ár-mánuður-dagur, til dæmis 2026-09-11." />
              <FormField label="Athugasemd (valfrjálst)" value={note} onChangeText={setNote} editable={!busy} multiline maxLength={500} placeholder="Til dæmis mánaðarlegt framlag" />
              <AppButton label="Skrá framlag" loading={busy} onPress={contribute} />
            </>
          ) : (
            <>
              <Text style={[styles.body, { color: colors.textSecondary }]}>Skráð framlög að þessu markmiði. Upphafsstaða er ekki hluti af framlagssögunni.</Text>
              {history.error && history.data ? <InlineNotice message={history.error} /> : null}
              {history.loading && !history.data ? <LoadingState /> : history.error && !history.data ? <ErrorState message={history.error} onRetry={history.retry} /> : history.data?.length ? (
                history.data.map((contribution) => (
                  <AppCard key={contribution.id} style={styles.contributionRow}>
                    <View style={styles.contributionCopy}>
                      <Text style={[styles.contributionAmount, { color: colors.text }]}>{formatISK(contribution.amount)}</Text>
                      <Text style={[styles.hint, { color: colors.textSecondary }]}>{formatDate(contribution.date)}{contribution.note ? ` · ${contribution.note}` : ''}</Text>
                    </View>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Eyða framlagi ${formatISK(contribution.amount)} frá ${formatDate(contribution.date)}`} disabled={busy} onPress={() => { clearError(); setDeleteContribution(contribution); }} style={styles.deleteButton}>
                      <Text style={[styles.deleteLabel, { color: colors.negative }]}>Eyða</Text>
                    </Pressable>
                  </AppCard>
                ))
              ) : <EmptyState label="Engin framlög skráð enn. Veldu Bæta við til að skrá fyrsta framlagið." />}
            </>
          )}
        </>
      )}
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  confirmTitle: { fontSize: 21, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 21 },
  label: { fontSize: 13, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 18 },
  balance: { gap: 7, paddingVertical: 4 },
  balanceValue: { fontSize: 25, fontWeight: '800', fontVariant: ['tabular-nums'] },
  contributionRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  contributionCopy: { flex: 1, gap: 5 },
  contributionAmount: { fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  deleteButton: { minWidth: 48, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  deleteLabel: { fontSize: 13, fontWeight: '700' },
});
