import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.row} accessibilityLabel="Mín Fjármál">
      <View style={[styles.mark, { backgroundColor: colors.primary }]}>
        <Text style={styles.markText}>M</Text>
      </View>
      {!compact && <Text style={[styles.name, { color: colors.text }]}>Mín Fjármál</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  mark: {
    alignItems: 'center',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  markText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
  },
});
