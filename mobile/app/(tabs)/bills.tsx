import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BillEditor } from '@/components/bill-editor';
import { FadeInView } from '@/components/fade-in-view';
import { Screen } from '@/components/screen';
import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { InlineNotice, MonthPicker } from '@/components/ui/finance-form';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state-view';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useRefreshableData } from '@/hooks/use-refreshable-data';
import { fetchBills } from '@/lib/finance-data';
import { formatISK, monthKey } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { BillWithPayment } from '@/types/finance';

export default function BillsScreen() {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const userId = user!.id;
  const [selectedMonth, setSelectedMonth] = useState(monthKey);
  const [editing, setEditing] = useState<BillWithPayment | 'new' | null>(null);
  const loadBills = useCallback(() => fetchBills(userId, selectedMonth), [selectedMonth, userId]);
  const { data, error, loading, refresh, refreshing, retry } = useRefreshableData(loadBills);
  const activeBills = (data ?? []).filter((bill) => bill.is_active);
  const inactiveBills = (data ?? []).filter((bill) => !bill.is_active);
  const total = activeBills.reduce((sum, bill) => sum + bill.amount, 0);
  const paid = (data ?? []).reduce((sum, bill) => sum + (bill.payment?.amount ?? 0), 0);
  const unpaid = activeBills.filter((bill) => !bill.payment).reduce((sum, bill) => sum + bill.amount, 0);

  function billRow(bill: BillWithPayment) {
    return (
      <AppCard key={bill.id} accessibilityLabel={`${bill.name}, ${formatISK(bill.amount)}, ${bill.payment ? 'greitt' : bill.is_active ? 'ógreitt' : 'óvirkur'}. Opna reikning.`} onPress={() => setEditing(bill)} style={styles.billRow}>
        <View style={[styles.billIcon, { backgroundColor: bill.payment ? colors.positiveSoft : colors.surfaceMuted }]}>
          <IconSymbol color={bill.payment ? colors.positive : colors.textSecondary} name={bill.payment ? 'checkmark.circle.fill' : 'calendar'} size={20} />
        </View>
        <View style={styles.billCopy}>
          <Text style={[styles.billName, { color: colors.text }]}>{bill.name}</Text>
          <Text style={[styles.billMeta, { color: colors.textSecondary }]}>
            {bill.payment ? `Greitt ${formatISK(bill.payment.amount)}` : `Gjalddagi ${bill.due_day}.`}
          </Text>
        </View>
        <View style={styles.billValue}>
          <Text style={[styles.billAmount, { color: colors.text }]}>{formatISK(bill.amount)}</Text>
          <IconSymbol name="chevron.right" color={colors.textSecondary} size={13} />
        </View>
      </AppCard>
    );
  }

  return (
    <>
      <Screen onRefresh={refresh} refreshing={refreshing}>
        <View style={styles.heading}>
          <Text style={[styles.title, { color: colors.text }]}>Reikningar</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Skipuleggðu mánuðinn og fylgstu með greiðslum.</Text>
        </View>
        <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
        <FadeInView>
          <AppCard style={styles.summary}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Eftir að greiða</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{formatISK(unpaid)}</Text>
            <View style={styles.summaryDetails}>
              <Text style={[styles.summaryMeta, { color: colors.textSecondary }]}>Áætlað {formatISK(total)}</Text>
              <Text style={[styles.summaryMeta, { color: colors.positive }]}>Greitt {formatISK(paid)}</Text>
            </View>
          </AppCard>
        </FadeInView>
        <AppButton label="Bæta við reikningi" onPress={() => setEditing('new')} />
        {error && data ? <InlineNotice message={error} /> : null}
        {loading && !data ? <AppCard><LoadingState /></AppCard> : error && !data ? (
          <AppCard><ErrorState message={error} onRetry={retry} /></AppCard>
        ) : data?.length ? (
          <FadeInView delay={80} style={styles.list}>
            {activeBills.map(billRow)}
            {inactiveBills.length ? (
              <>
                <View style={styles.inactiveHeading}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Óvirkir reikningar</Text>
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Ekki teknir með í áætlun eða eftirstöðvum.</Text>
                </View>
                {inactiveBills.map(billRow)}
              </>
            ) : null}
          </FadeInView>
        ) : <AppCard><EmptyState label="Engir reikningar í þessum mánuði. Bættu þeim fyrsta við hér að ofan." /></AppCard>}
      </Screen>
      {editing ? <BillEditor key={editing === 'new' ? `${selectedMonth}-new` : editing.id} userId={userId} month={selectedMonth} bill={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void refresh(); }} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 5 },
  title: { fontSize: 30, fontWeight: '900' },
  subtitle: { fontSize: 13, lineHeight: 19 },
  summary: { gap: 8 },
  summaryLabel: { fontSize: 13, fontWeight: '700' },
  summaryValue: { fontSize: 30, fontVariant: ['tabular-nums'], fontWeight: '900' },
  summaryDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingTop: 5 },
  summaryMeta: { fontSize: 12, fontWeight: '600' },
  list: { gap: 10 },
  billRow: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 85 },
  billIcon: { alignItems: 'center', borderRadius: 8, height: 40, justifyContent: 'center', width: 40 },
  billCopy: { flex: 1, gap: 4 },
  billName: { fontSize: 15, fontWeight: '800' },
  billMeta: { fontSize: 12 },
  billValue: { alignItems: 'flex-end', gap: 7 },
  billAmount: { fontSize: 14, fontVariant: ['tabular-nums'], fontWeight: '800' },
  inactiveHeading: { gap: 5, paddingTop: 15, paddingBottom: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
});
