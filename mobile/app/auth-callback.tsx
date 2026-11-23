import { Redirect, router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { AppButton } from '@/components/ui/app-button';
import { useAppTheme } from '@/hooks/use-app-theme';
import { INVALID_AUTH_LINK } from '@/lib/auth-links';
import { useAuth } from '@/providers/auth-provider';

export default function AuthCallbackScreen() {
  const { colors } = useAppTheme();
  const { session, isPasswordRecovery, authLinkStatus, authLinkError, configurationError } = useAuth();
  if (session && isPasswordRecovery) return <Redirect href="/reset-password" />;
  if (session && authLinkStatus === 'success') return <Redirect href="/(tabs)" />;
  const processing = authLinkStatus === 'processing';

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <BrandMark />
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
          {processing ? 'Staðfesti hlekkinn' : 'Ekki tókst að opna hlekkinn'}
        </Text>
        {processing ? <ActivityIndicator accessibilityLabel="Staðfesti innskráningu" color={colors.primary} /> : (
          <>
            <Text accessibilityRole="alert" style={[styles.body, { color: colors.textSecondary }]}>
              {configurationError || authLinkError || INVALID_AUTH_LINK}
            </Text>
            <AppButton label={session ? 'Til baka í appið' : 'Til baka í innskráningu'} onPress={() => router.replace(session ? '/(tabs)' : '/sign-in')} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'center', padding: 24 },
  content: { alignSelf: 'center', gap: 22, maxWidth: 440, width: '100%' },
  title: { fontSize: 28, fontWeight: '900' },
  body: { fontSize: 15, lineHeight: 23 },
});
