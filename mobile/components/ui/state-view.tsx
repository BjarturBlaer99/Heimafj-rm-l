import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppTheme } from '@/hooks/use-app-theme';

export function LoadingState({ label = 'Sæki gögn...' }: { label?: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.state}>
      <ActivityIndicator color={colors.primary} size="small" />
      <Text style={[styles.body, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.state}>
      <View style={[styles.icon, { backgroundColor: colors.negativeSoft }]}>
        <IconSymbol name="exclamationmark.triangle.fill" color={colors.negative} size={21} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>Ekki tókst að sækja gögn</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>{message}</Text>
      <Pressable onPress={onRetry} style={({ pressed }) => pressed && styles.pressed}>
        <Text style={[styles.retry, { color: colors.primary }]}>Reyna aftur</Text>
      </Pressable>
    </View>
  );
}

export function EmptyState({ label }: { label: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.state}>
      <Text style={[styles.body, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    alignItems: 'center',
    gap: 9,
    justifyContent: 'center',
    minHeight: 160,
    padding: 24,
  },
  icon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  retry: {
    fontSize: 14,
    fontWeight: '800',
    paddingVertical: 4,
  },
  pressed: {
    opacity: 0.55,
  },
});
