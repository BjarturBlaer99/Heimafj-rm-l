import { PropsWithChildren, ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/use-app-theme';

type ScreenProps = PropsWithChildren<{
  onRefresh?: () => void;
  refreshing?: boolean;
  footer?: ReactNode;
}>;

export function Screen({ children, footer, onRefresh, refreshing = false }: ScreenProps) {
  const { colors } = useAppTheme();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      {footer ? <View>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    gap: 18,
    maxWidth: 720,
    paddingBottom: 32,
    paddingHorizontal: 18,
    paddingTop: 12,
    width: '100%',
  },
});
