import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { AppButton } from '@/components/ui/app-button';
import { AuthField } from '@/components/ui/auth-field';
import { useAppTheme } from '@/hooks/use-app-theme';
import { authErrorMessage } from '@/lib/auth-errors';
import { authRedirectUrl } from '@/lib/auth-links';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export default function ForgotPasswordScreen() {
  const { colors } = useAppTheme();
  const { configurationError } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const submitting = useRef(false);

  async function sendReset() {
    if (submitting.current || configurationError || !email.trim() || sent) return;
    submitting.current = true;
    setLoading(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: authRedirectUrl('reset-password'),
      });
      if (error) throw error;
      setSent(true);
    } catch (error) {
      setErrorMessage(authErrorMessage(error));
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <BrandMark />
            <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Gleymt lykilorð?</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              Sláðu inn netfangið þitt og við sendum þér hlekk til að velja nýtt lykilorð.
            </Text>
            {configurationError || errorMessage ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: colors.negative }}>{configurationError || errorMessage}</Text> : null}
            {sent ? (
              <Text accessibilityRole="alert" style={[styles.notice, { backgroundColor: colors.positiveSoft, color: colors.text }]}>
                Ef aðgangur er skráður á netfangið færðu tölvupóst með næstu skrefum. Opnaðu hlekkinn í þessum síma. Athugaðu einnig ruslpóstinn.
              </Text>
            ) : null}
            <AuthField autoCapitalize="none" autoComplete="email" autoCorrect={false} editable={!loading}
              inputMode="email" label="Netfang" maxLength={120} onChangeText={(value) => { setEmail(value); setSent(false); }}
              onSubmitEditing={sendReset} placeholder="nafn@netfang.is" returnKeyType="send" value={email} />
            <AppButton disabled={Boolean(configurationError) || !email.trim() || sent} label="Senda endurstillingarhlekk" loading={loading} onPress={sendReset} />
            <AppButton disabled={loading} label="Til baka í innskráningu" variant="secondary" onPress={() => router.replace('/sign-in')} />
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
  body: { fontSize: 15, lineHeight: 22 },
  notice: { borderRadius: 8, padding: 16, fontSize: 14, lineHeight: 21 },
});
