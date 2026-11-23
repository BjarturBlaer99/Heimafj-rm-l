import { StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/ui/app-card';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { useAppTheme } from '@/hooks/use-app-theme';

type MetricCardProps = {
  label: string;
  value: string;
  icon: IconSymbolName;
  tone?: 'default' | 'positive' | 'negative';
  onPress?: () => void;
};

export function MetricCard({ icon, label, onPress, tone = 'default', value }: MetricCardProps) {
  const { colors } = useAppTheme();
  const accent = tone === 'positive' ? colors.positive : tone === 'negative' ? colors.negative : colors.primary;
  const soft =
    tone === 'positive' ? colors.positiveSoft : tone === 'negative' ? colors.negativeSoft : colors.primarySoft;

  return (
    <AppCard accessibilityLabel={`${label}: ${value}`} onPress={onPress} style={styles.card}>
      <View style={[styles.icon, { backgroundColor: soft }]}>
        <IconSymbol name={icon} color={accent} size={19} weight="semibold" />
      </View>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.value, { color: colors.text }]}>
        {value}
      </Text>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: 9,
    minHeight: 142,
    minWidth: 150,
  },
  icon: {
    alignItems: 'center',
    borderRadius: 7,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  value: {
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
});
