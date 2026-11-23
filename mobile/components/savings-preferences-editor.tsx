import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { AppButton } from '@/components/ui/app-button';
import { FormSheet, InlineNotice } from '@/components/ui/finance-form';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useFormAction } from '@/hooks/use-form-action';
import { saveSavingsPreferences } from '@/lib/finance-actions';
import { SavingsPreferences } from '@/lib/savings-preferences';
import { useFeedback } from '@/providers/feedback-provider';
import { SavingsBucketType } from '@/types/finance';

export function SavingsPreferencesEditor({ userId, preferences, buckets, onClose }: {
  userId: string; preferences: SavingsPreferences; buckets: { bucket_type: SavingsBucketType; label: string }[]; onClose: () => void;
}) {
  const [draft, setDraft] = useState(preferences);
  const { colors } = useAppTheme();
  const action = useFormAction();
  const notify = useFeedback();
  function move(index: number, direction: number) {
    const order = [...draft.order];
    [order[index], order[index + direction]] = [order[index + direction], order[index]];
    setDraft({ ...draft, order });
  }
  function toggle(key: 'housing' | 'goal', type: SavingsBucketType, checked: boolean) {
    setDraft({ ...draft, [key]: checked ? [...draft[key], type] : draft[key].filter((item) => item !== type) });
  }
  return <FormSheet visible title="Skipting sparnaðar" subtitle="Veldu röð flokka og hvað telst til húsnæðis og markmiða. Stöður breytast ekki." onClose={onClose} busy={action.busy}>
    {draft.order.map((type, index) => {
      const label = buckets.find((bucket) => bucket.bucket_type === type)?.label ?? type;
      return <View key={type} style={[styles.card, { borderColor: colors.border }]}>
        <View style={styles.row}><Text style={[styles.title, { color: colors.text }]}>{label}</Text>
          {[-1, 1].map((direction) => <Pressable key={direction} accessibilityRole="button" accessibilityLabel={`Færa ${label} ${direction < 0 ? 'upp' : 'niður'}`} disabled={action.busy || index + direction < 0 || index + direction >= draft.order.length} onPress={() => move(index, direction)} style={{ padding: 12, opacity: index + direction < 0 || index + direction >= draft.order.length ? 0.25 : 1 }}><Text style={{ color: colors.primary, fontSize: 22 }}>{direction < 0 ? '↑' : '↓'}</Text></Pressable>)}
        </View>
        {(['housing', 'goal'] as const).map((key) => <View key={key} style={styles.row}><Text style={[styles.label, { color: colors.text }]}>{key === 'housing' ? 'Telst til húsnæðissparnaðar' : 'Telst með í markmiðum'}</Text><Switch accessibilityLabel={`${label}: ${key === 'housing' ? 'húsnæðissparnaður' : 'markmið'}`} disabled={action.busy} value={draft[key].includes(type)} onValueChange={(checked) => toggle(key, type, checked)} trackColor={{ true: colors.primary }} /></View>)}
      </View>;
    })}
    {action.error ? <InlineNotice message={action.error} /> : null}
    <AppButton label="Vista skiptingu" loading={action.busy} onPress={async () => { if (await action.run(() => saveSavingsPreferences(userId, draft))) { onClose(); notify('Skipting sparnaðar var vistuð.'); } }} />
  </FormSheet>;
}
const styles = StyleSheet.create({ card: { padding: 14, gap: 14, borderWidth: 1, borderRadius: 12 }, row: { flexDirection: 'row', alignItems: 'center', gap: 8 }, title: { fontSize: 16, fontWeight: '700', flex: 1 }, label: { flex: 1, fontSize: 13, lineHeight: 19 } });
