import { Redirect, router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, type TextInputInstance, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { AppButton } from '@/components/ui/app-button';
import { AuthField } from '@/components/ui/auth-field';
import { useAppTheme } from '@/hooks/use-app-theme';
import { authErrorMessage } from '@/lib/auth-errors';
import { INVALID_AUTH_LINK } from '@/lib/auth-links';
import { isStrongPassword, PASSWORD_REQUIREMENTS } from '@/lib/auth-password';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export default function ResetPasswordScreen() {
  const { colors } = useAppTheme();
  const { session, isPasswordRecovery, authLinkStatus, authLinkError, configurationError, finishPasswordRecovery, cancelPasswordRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState<'save' | 'cancel' | null>(null);
  const [completed, setCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const submitting = useRef(false);
  const confirmationRef = useRef<TextInputInstance>(null);
  const valid = isStrongPassword(password) && password === confirmation;
  const processing = authLinkStatus === 'processing';
  const canReset = Boolean(session && isPasswordRecovery && !configurationError && !processing);

  async function savePassword() {
    if (submitting.current || !canReset || !valid) return;
    submitting.current = true;
    setBusy('save');
    setErrorMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await finishPasswordRecovery();
      setPassword('');
      setConfirmation('');
      setCompleted(true);
    } catch (error) {
      setErrorMessage(authErrorMessage(error));
    } finally {
      submitting.current = false;
      setBusy(null);
    }
  }

  async function cancel() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy('cancel');
    setErrorMessage(null);
    try {
      await cancelPasswordRecovery();
      router.replace('/sign-in');
    } catch (error) {
      setErrorMessage(authErrorMessage(error));
    } finally {
      submitting.current = false;
      setBusy(null);
    }
  }

  if (completed) return <Redirect href="/(tabs)" />;
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <BrandMark />
            <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Veldu nýtt lykilorð</Text>
            {errorMessage ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: colors.negative }}>{errorMessage}</Text> : null}
            {processing ? <ActivityIndicator accessibilityLabel="Staðfesti endurstillingarhlekk" color={colors.primary} /> : canReset ? (
              <>
                <Text style={[styles.body, { color: colors.textSecondary }]}>{session?.user.email}</Text>
                <AuthField autoCapitalize="none" autoComplete="new-password" autoCorrect={false} editable={!busy}
                  label="Nýtt lykilorð" maxLength={100} onChangeText={setPassword}
                  onSubmitEditing={() => confirmationRef.current?.focus()} returnKeyType="next" secureTextEntry value={password} />
                <Text style={[styles.body, { color: colors.textSecondary }]}>{PASSWORD_REQUIREMENTS}</Text>
                <AuthField ref={confirmationRef} autoCapitalize="none" autoComplete="new-password" autoCorrect={false}
                  editable={!busy} label="Staðfesta nýtt lykilorð" maxLength={100} onChangeText={setConfirmation}
                  onSubmitEditing={savePassword} returnKeyType="go" secureTextEntry value={confirmation} />
                {confirmation && confirmation !== password ? (
                  <Text accessibilityRole="alert" style={{ color: colors.negative }}>Lykilorðin passa ekki saman.</Text>
                ) : null}
                <AppButton disabled={!valid || busy === 'cancel'} label="Vista nýtt lykilorð" loading={busy === 'save'} onPress={savePassword} />
                <AppButton disabled={busy === 'save'} label="Hætta við og skrá út" loading={busy === 'cancel'} onPress={cancel} variant="secondary" />
              </>
            ) : (
              <>
                <Text accessibilityRole="alert" style={[styles.body, { color: colors.textSecondary }]}>{configurationError || authLinkError || INVALID_AUTH_LINK}</Text>
                <AppButton label={session ? 'Til baka í appið' : 'Óska eftir nýjum hlekk'} onPress={() => router.replace(session ? '/(tabs)' : '/forgot-password')} />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  form: { alignSelf: 'center', gap: 20, maxWidth: 440, width: '100%' },
  title: { fontSize: 30, fontWeight: '900' },
  body: { fontSize: 14, lineHeight: 21 },
});
