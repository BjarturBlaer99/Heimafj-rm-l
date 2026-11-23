import { StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatDate, formatISK } from '@/lib/format';
import type { Transaction } from '@/types/finance';

export function TransactionRow({ transaction }: { transaction: Transaction }) {
  const { colors } = useAppTheme();
  const isIncome = transaction.type === 'income';
  const accent = isIncome ? colors.positive : colors.negative;
  const soft = isIncome ? colors.positiveSoft : colors.negativeSoft;

  return (
    <View accessible accessibilityLabel={`${transaction.note ?? transaction.categories?.name ?? 'Færsla'}, ${formatISK(transaction.amount)}`} style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.icon, { backgroundColor: soft }]}>
        <IconSymbol name={isIncome ? 'arrow.down.right' : 'arrow.up.right'} color={accent} size={18} />
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>
          {transaction.note || transaction.categories?.name || (isIncome ? 'Tekjur' : 'Útgjöld')}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {transaction.categories?.name ?? 'Óflokkað'} · {formatDate(transaction.date)}
        </Text>
      </View>
      <Text style={[styles.amount, { color: accent }]}>
        {isIncome ? '+' : '−'}{formatISK(transaction.amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    minHeight: 72,
    paddingVertical: 10,
  },
  icon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  copy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
  },
  meta: {
    fontSize: 12,
  },
  amount: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
});
