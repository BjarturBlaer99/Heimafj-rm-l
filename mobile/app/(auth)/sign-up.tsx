import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { FadeInView } from '@/components/fade-in-view';
import { AppButton } from '@/components/ui/app-button';
import { AuthField } from '@/components/ui/auth-field';
import { useAppTheme } from '@/hooks/use-app-theme';
import { authErrorMessage } from '@/lib/auth-errors';
import { authRedirectUrl } from '@/lib/auth-links';
import { isStrongPassword, PASSWORD_REQUIREMENTS } from '@/lib/auth-password';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { openPublicLink } from '@/lib/public-links';

export default function SignUpScreen() {
  const { colors } = useAppTheme();
  const { configurationError } = useAuth();
  const submitting = useRef(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const valid = fullName.trim().length >= 2 && email.trim() && isStrongPassword(password) && password === confirmation;

  async function signUp() {
    if (!valid || configurationError || submitting.current || confirmationSent) return;
    submitting.current = true;
    setLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(), password,
        options: { data: { full_name: fullName.trim() }, emailRedirectTo: authRedirectUrl('auth-callback') },
      });
      if (error) throw error;
      if (!data.session) {
        setConfirmationSent(true);
      }
    } catch (error) {
      setErrorMessage(authErrorMessage(error));
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <FadeInView style={styles.form}>
            <BrandMark />
            <View style={styles.heading}>
              <Text style={[styles.title, { color: colors.text }]}>Stofnaðu aðgang</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Búðu til öruggan aðgang fyrir appið.
              </Text>
            </View>
            {configurationError || errorMessage ? (
              <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.validation, { color: colors.negative }]}>{configurationError || errorMessage}</Text>
            ) : null}
            {confirmationSent ? (
              <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.subtitle, { color: colors.positive }]}>
                Athugaðu tölvupóstinn þinn. Opnaðu staðfestingarhlekkinn í þessum síma til að fara aftur í appið.
              </Text>
            ) : null}
            <View style={styles.fields}>
              <AuthField autoComplete="name" editable={!loading} label="Nafn" maxLength={80} onChangeText={setFullName} placeholder="Fullt nafn" value={fullName} />
              <AuthField
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={!loading}
                maxLength={120}
                inputMode="email"
                label="Netfang"
                onChangeText={setEmail}
                placeholder="nafn@netfang.is"
                value={email}
              />
              <AuthField
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                maxLength={100}
                label="Lykilorð"
                onChangeText={setPassword}
                placeholder="Að minnsta kosti 10 stafir"
                secureTextEntry
                value={password}
              />
              <Text style={[styles.validation, { color: colors.textSecondary }]}>{PASSWORD_REQUIREMENTS}</Text>
              <AuthField
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                maxLength={100}
                label="Staðfesta lykilorð"
                onChangeText={setConfirmation}
                onSubmitEditing={signUp}
                placeholder="Sláðu lykilorðið aftur inn"
                secureTextEntry
                returnKeyType="go"
                value={confirmation}
              />
              {confirmation && password !== confirmation ? (
                <Text style={[styles.validation, { color: colors.negative }]}>Lykilorðin passa ekki saman.</Text>
              ) : null}
            </View>
            <AppButton disabled={!valid || Boolean(configurationError) || confirmationSent} label="Stofna aðgang" loading={loading} onPress={signUp} />
            <Pressable accessibilityRole="link" onPress={() => { void openPublicLink('privacy').catch((error) => setErrorMessage(error.message)); }} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={[styles.validation, { color: colors.primary, textAlign: 'center', lineHeight: 20 }]}>Lestu hvernig farið er með gögnin þín í persónuverndarstefnunni.</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={() => router.replace('/sign-in')}
              style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}>
              <Text style={[styles.secondaryText, { color: colors.textSecondary }]}>Ertu með aðgang? </Text>
              <Text style={[styles.secondaryLink, { color: colors.primary }]}>Til baka í innskráningu</Text>
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
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 28 },
  form: { alignSelf: 'center', gap: 22, maxWidth: 440, width: '100%' },
  heading: { gap: 8 },
  title: { fontSize: 30, fontWeight: '900', letterSpacing: 0 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  fields: { gap: 14 },
  validation: { fontSize: 12, fontWeight: '700', marginTop: -6 },
  secondaryAction: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', paddingVertical: 8 },
  secondaryText: { fontSize: 14 },
  secondaryLink: { fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.55 },
});
