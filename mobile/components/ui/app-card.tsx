import { PropsWithChildren } from 'react';
import { Platform, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

type AppCardProps = PropsWithChildren<{
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}>;

export function AppCard({ accessibilityLabel, children, onPress, style }: AppCardProps) {
  const { colors, isDark } = useAppTheme();
  const shadowStyle: ViewStyle =
    Platform.OS === 'web'
      ? { boxShadow: isDark ? '0 8px 24px rgba(0, 0, 0, 0.32)' : '0 8px 24px rgba(17, 19, 24, 0.09)' }
      : {
          elevation: 3,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.32 : 0.09,
          shadowRadius: 16,
        };
  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    shadowStyle,
    style,
  ];

  if (!onPress) return <View style={cardStyle}>{children}</View>;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [cardStyle, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },
});
