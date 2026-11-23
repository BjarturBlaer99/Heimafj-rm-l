import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type TextInputInstance,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { FadeInView } from '@/components/fade-in-view';
import { AppButton } from '@/components/ui/app-button';
import { AuthField } from '@/components/ui/auth-field';
import { useAppTheme } from '@/hooks/use-app-theme';
import { authErrorMessage } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export default function SignInScreen() {
  const { colors } = useAppTheme();
  const { configurationError, sessionError } = useAuth();
  const passwordRef = useRef<TextInputInstance>(null);
  const submitting = useRef(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function signIn() {
    if (submitting.current || configurationError || !email.trim() || !password) return;
    submitting.current = true;
    setLoading(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), password,
      });
      if (error) throw error;
    } catch (error) {
      setErrorMessage(authErrorMessage(error));
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={12}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <FadeInView style={styles.form}>
            <BrandMark />
            <View style={styles.heading}>
              <Text style={[styles.title, { color: colors.text }]}>Velkomin aftur</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Fjármálin þín, skýr og aðgengileg í símanum.
              </Text>
            </View>

            {configurationError || errorMessage || sessionError ? (
              <View style={[styles.notice, { backgroundColor: colors.negativeSoft }]}>
                <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.noticeText, { color: colors.negative }]}>{configurationError || errorMessage || sessionError}</Text>
              </View>
            ) : null}

            <View style={styles.fields}>
              <AuthField
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={!loading}
                inputMode="email"
                label="Netfang"
                onChangeText={setEmail}
                onSubmitEditing={() => passwordRef.current?.focus()}
                placeholder="nafn@netfang.is"
                returnKeyType="next"
                value={email}
              />
              <AuthField
                ref={passwordRef}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                label="Lykilorð"
                onChangeText={setPassword}
                onSubmitEditing={signIn}
                placeholder="Lykilorðið þitt"
                returnKeyType="go"
                secureTextEntry
                value={password}
              />
            </View>

            <AppButton
              disabled={Boolean(configurationError) || !email.trim() || !password}
              label="Innskráning"
              loading={loading}
              onPress={signIn}
            />

            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={() => router.push('/forgot-password')}
              style={styles.secondaryAction}>
              <Text style={[styles.secondaryLink, { color: colors.primary }]}>Gleymt lykilorð?</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={() => router.push('/sign-up')}
              style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}>
              <Text style={[styles.secondaryText, { color: colors.textSecondary }]}>Ertu ekki með aðgang? </Text>
              <Text style={[styles.secondaryLink, { color: colors.primary }]}>Stofna aðgang</Text>
            </Pressable>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 32,
  },
  form: {
    alignSelf: 'center',
    gap: 24,
    maxWidth: 440,
    width: '100%',
  },
  heading: { gap: 8 },
  title: { fontSize: 32, fontWeight: '900', letterSpacing: 0 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  notice: { borderRadius: 8, padding: 13 },
  noticeText: { fontSize: 13, fontWeight: '600', lineHeight: 19 },
  fields: { gap: 16 },
  secondaryAction: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  secondaryText: { fontSize: 14 },
  secondaryLink: { fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.55 },
});
