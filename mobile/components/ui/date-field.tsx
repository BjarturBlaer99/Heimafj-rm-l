import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { FormField } from '@/components/ui/finance-form';
import { useAppTheme } from '@/hooks/use-app-theme';
import { localToday, validateDate } from '@/lib/finance-validation';

export function DateField({ label, value, onChange, disabled = false, optional = false }: {
  label: string; value: string; onChange: (value: string) => void; disabled?: boolean; optional?: boolean;
}) {
  const { colors, isDark } = useAppTheme();
  const [open, setOpen] = useState(false);
  let valid = value;
  try { validateDate(valid); } catch { valid = localToday(); }
  const [year, month, day] = valid.split('-').map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);
  if (Platform.OS === 'web') return <FormField label={label} value={value} onChangeText={onChange} editable={!disabled} placeholder="ÁÁÁÁ-MM-DD" maxLength={10} hint={optional ? 'Valfrjálst · ár-mánuður-dagur' : 'Ár-mánuður-dagur'} />;
  return <View style={styles.field}>
    <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value || 'Velja dagsetningu'}`} accessibilityState={{ expanded: open, disabled }} disabled={disabled}
      onPress={() => setOpen(!open)} style={[styles.button, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={{ color: value ? colors.text : colors.textSecondary, fontSize: 17 }}>{value ? date.toLocaleDateString('is-IS', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Velja dagsetningu'}</Text>
    </Pressable>
    {open ? <View style={styles.picker}>
      <DateTimePicker value={date} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} locale="is-IS" themeVariant={isDark ? 'dark' : 'light'}
        style={{ width: '100%' }} onChange={(event, selected) => {
          if (Platform.OS !== 'ios') setOpen(false);
          if (event.type !== 'set' || !selected) return;
          onChange(`${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}`);
        }} />
      {Platform.OS === 'ios' ? <AppButton label="Velja dagsetningu" variant="secondary" onPress={() => { if (!value) onChange(valid); setOpen(false); }} /> : null}
    </View> : null}
    {optional && value ? <AppButton label="Sleppa dagsetningu" variant="secondary" disabled={disabled} onPress={() => { onChange(''); setOpen(false); }} /> : null}
  </View>;
}
const styles = StyleSheet.create({ field: { gap: 8 }, label: { fontSize: 14, fontWeight: '700' }, button: { minHeight: 52, borderRadius: 10, borderWidth: 1, padding: 14, alignItems: 'center', justifyContent: 'center' }, picker: { width: '100%', overflow: 'hidden', gap: 8 } });
