import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, type TextInputInstance, type TextInputProps, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

type AuthFieldProps = TextInputProps & {
  label: string;
};

export const AuthField = forwardRef<TextInputInstance, AuthFieldProps>(function AuthField(
  { label, style, ...props },
  ref,
) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={colors.textSecondary}
        selectionColor={colors.primary}
        style={[
          styles.input,
          { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
          style,
        ]}
        {...props}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    gap: 7,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    height: 52,
    paddingHorizontal: 15,
  },
});
