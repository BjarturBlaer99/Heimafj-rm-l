import type { ErrorBoundaryProps } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { useAppTheme } from '@/hooks/use-app-theme';
import { supabase } from '@/lib/supabase';

export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { colors } = useAppTheme();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await supabase.auth.signOut({ scope: 'local' });
      if (result.error) throw result.error;
      await retry();
    } catch { setNotice('Ekki tókst að skrá þig út. Lokaðu appinu og opnaðu það aftur.'); }
    finally { setBusy(false); }
  }
  return <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.message}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Ekki tókst að opna skjáinn</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>Reyndu aftur. Ef villan kemur aftur geturðu farið í innskráningu og opnað appið að nýju.</Text>
        {__DEV__ ? <Text selectable style={[styles.details, { color: colors.textSecondary }]}>{error.name}: {error.message}</Text> : null}
        {notice ? <Text accessibilityRole="alert" style={[styles.body, { color: colors.negative }]}>{notice}</Text> : null}
        <AppButton label="Reyna aftur" disabled={busy} onPress={() => void retry()} />
        <AppButton label="Fara í innskráningu" variant="secondary" loading={busy} onPress={() => void signOut()} />
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safeArea: { flex: 1 }, content: { flexGrow: 1, justifyContent: 'center', padding: 24 }, message: { alignSelf: 'center', width: '100%', maxWidth: 440, gap: 18 }, title: { fontSize: 26, fontWeight: '800' }, body: { fontSize: 15, lineHeight: 23 }, details: { fontSize: 12, lineHeight: 18 } });
