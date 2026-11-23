import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';
import type { MonthlyTrendPoint } from '@/types/finance';

export function CashFlowChart({ data }: { data: MonthlyTrendPoint[] }) {
  const { colors } = useAppTheme();
  const maximum = Math.max(1, ...data.flatMap((point) => [point.income, point.expense]));

  return (
    <View>
      <View style={styles.legend}>
        <Legend color={colors.positive} label="Tekjur" />
        <Legend color={colors.negative} label="Útgjöld" />
      </View>
      <View style={styles.chart}>
        {data.map((point) => (
          <View key={point.key} style={styles.group}>
            <View style={styles.bars}>
              <View
                style={[
                  styles.bar,
                  { backgroundColor: colors.positive, height: Math.max(3, (point.income / maximum) * 112) },
                ]}
              />
              <View
                style={[
                  styles.bar,
                  { backgroundColor: colors.negative, height: Math.max(3, (point.expense / maximum) * 112) },
                ]}
              />
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{point.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 14,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  chart: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    height: 144,
    justifyContent: 'space-between',
  },
  group: {
    alignItems: 'center',
    flex: 1,
    gap: 7,
  },
  bars: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 3,
    height: 116,
  },
  bar: {
    borderRadius: 3,
    minHeight: 3,
    width: 8,
  },
  label: {
    fontSize: 10,
    textTransform: 'capitalize',
  },
});
