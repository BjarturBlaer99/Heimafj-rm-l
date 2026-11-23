import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

import { BrandMark } from '@/components/brand-mark';
import { useAppTheme } from '@/hooks/use-app-theme';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { FeedbackProvider } from '@/providers/feedback-provider';

export { AppErrorBoundary as ErrorBoundary } from '@/components/app-error-boundary';

SplashScreen.setOptions({ duration: 500, fade: true });

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <FeedbackProvider><RootNavigator /></FeedbackProvider>
    </AuthProvider>
  );
}

function RootNavigator() {
  const { colors, colorScheme, isDark } = useAppTheme();
  const { loading, session, isPasswordRecovery } = useAuth();
  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: colors.background,
      card: colors.surface,
      border: colors.border,
      primary: colors.primary,
      text: colors.text,
    },
  };

  if (loading) {
    return (
      <View style={[styles.launch, { backgroundColor: colors.background }]}>
        <BrandMark />
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.launchLabel, { color: colors.textSecondary }]}>Undirbý örugga tengingu...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack screenOptions={{ animation: 'fade', headerShown: false }}>
        <Stack.Protected guard={!session} redirectTo={isPasswordRecovery ? '/reset-password' : '/(tabs)'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        {/* The auth group has no index route, so target its sign-in screen explicitly. */}
        <Stack.Protected guard={Boolean(session) && !isPasswordRecovery} redirectTo={session && isPasswordRecovery ? '/reset-password' : '/sign-in'}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Screen name="auth-callback" />
        <Stack.Screen name="reset-password" options={{ gestureEnabled: !isPasswordRecovery }} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  launch: {
    alignItems: 'center',
    flex: 1,
    gap: 18,
    justifyContent: 'center',
    padding: 24,
  },
  launchLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
