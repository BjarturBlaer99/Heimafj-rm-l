import { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/use-app-theme';
import { monthLabel, shiftMonth } from '@/lib/format';

export function FormSheet({ visible, title, subtitle, onClose, busy = false, children }: PropsWithChildren<{
  visible: boolean; title: string; subtitle?: string; onClose: () => void; busy?: boolean;
}>) {
  const { colors } = useAppTheme();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { if (!busy) onClose(); }}>
      <SafeAreaView testID="finance-form" accessibilityLabel={title} accessibilityViewIsModal style={[styles.sheet, { backgroundColor: colors.background }]}>
        <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.headingCopy}>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{title}</Text>
            {subtitle ? <Text style={[styles.hint, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Loka glugga" accessibilityState={{ disabled: busy }} disabled={busy} onPress={onClose} style={[styles.close, { backgroundColor: colors.surfaceMuted }, busy && styles.disabled]}>
            <Text style={[styles.closeText, { color: colors.textSecondary }]}>×</Text>
          </Pressable>
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets={Platform.OS !== 'ios'} contentContainerStyle={styles.form}>
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

export function FormField({ label, hint, style, ...props }: TextInputProps & { label: string; hint?: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <TextInput accessibilityLabel={label} placeholderTextColor={colors.textSecondary} selectionColor={colors.primary} style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }, props.multiline && styles.multiline, style]} {...props} />
      {hint ? <Text style={[styles.hint, { color: colors.textSecondary }]}>{hint}</Text> : null}
    </View>
  );
}

export function ChoiceChips({ label, value, options, onChange, disabled }: {
  label?: string; value: string; options: { label: string; value: string }[]; onChange: (value: string) => void; disabled?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.field}>
      {label ? <Text style={[styles.label, { color: colors.text }]}>{label}</Text> : null}
      <View style={styles.choices}>
        {options.map((option) => (
          <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{ checked: option.value === value, disabled }} disabled={disabled} onPress={() => onChange(option.value)} style={({ pressed }) => [styles.chip, { backgroundColor: option.value === value ? colors.primarySoft : colors.surface, borderColor: option.value === value ? colors.primary : colors.border }, (pressed || disabled) && styles.disabled]}>
            <Text style={[styles.chipLabel, { color: option.value === value ? colors.primary : colors.textSecondary }]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function InlineNotice({ message, kind = 'error' }: { message: string; kind?: 'error' | 'success' }) {
  const { colors } = useAppTheme();
  return <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.notice, { backgroundColor: kind === 'error' ? colors.negativeSoft : colors.positiveSoft }]}><Text style={[styles.noticeText, { color: kind === 'error' ? colors.negative : colors.positive }]}>{message}</Text></View>;
}

export function MonthPicker({ value, onChange }: { value: string; onChange: (month: string) => void }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.monthPicker, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Fyrri mánuður" onPress={() => onChange(shiftMonth(value, -1))} style={styles.monthArrow}><Text style={[styles.arrowText, { color: colors.primary }]}>‹</Text></Pressable>
      <Text accessibilityLiveRegion="polite" style={[styles.monthLabel, { color: colors.text }]}>{monthLabel(value)}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Næsti mánuður" onPress={() => onChange(shiftMonth(value, 1))} style={styles.monthArrow}><Text style={[styles.arrowText, { color: colors.primary }]}>›</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  sheetHeader: { paddingHorizontal: 20, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headingCopy: { flex: 1, gap: 5 },
  title: { fontSize: 23, fontWeight: '800' },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 28, lineHeight: 30 },
  form: { alignSelf: 'center', width: '100%', maxWidth: 620, padding: 20, paddingBottom: 40, gap: 20 },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '700' },
  input: { minHeight: 52, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 17 },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  hint: { fontSize: 12, lineHeight: 18 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 9, borderWidth: 1, minHeight: 44, paddingVertical: 12, paddingHorizontal: 14, justifyContent: 'center' },
  chipLabel: { fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  notice: { borderRadius: 9, padding: 14 },
  noticeText: { fontSize: 13, lineHeight: 20 },
  monthPicker: { borderWidth: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthArrow: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 30, lineHeight: 34 },
  monthLabel: { fontSize: 14, fontWeight: '700', textTransform: 'capitalize' },
});
