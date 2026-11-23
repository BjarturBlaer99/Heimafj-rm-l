import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { AccountTools } from '@/components/account-tools';
import { useFeedback } from '@/providers/feedback-provider';
import { FadeInView } from '@/components/fade-in-view';
import { Screen } from '@/components/screen';
import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { FormField, FormSheet, InlineNotice } from '@/components/ui/finance-form';
import { ErrorState, LoadingState } from '@/components/ui/state-view';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useFormAction } from '@/hooks/use-form-action';
import { useRefreshableData } from '@/hooks/use-refreshable-data';
import { authErrorMessage } from '@/lib/auth-errors';
import { saveProfile } from '@/lib/finance-actions';
import { fetchProfile } from '@/lib/finance-data';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export default function ProfileScreen() {
  const { colors, colorScheme } = useAppTheme();
  const { user } = useAuth();
  const userId = user!.id;
  const loadProfile = useCallback(() => fetchProfile(userId), [userId]);
  const { data, error, loading, refresh, refreshing, retry } = useRefreshableData(loadProfile);
  const fullName = data?.full_name?.trim() || 'Notandi';
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const action = useFormAction();
  const notify = useFeedback();

  async function save() {
    if (await action.run(async () => { await saveProfile(userId, name.trim()); })) {
      setEditing(false);
      notify('Nafnið þitt var uppfært.');
    }
  }

  async function signOut() {
    await action.run(async () => {
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
      if (signOutError) throw new Error(authErrorMessage(signOutError));
    });
  }

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <BrandMark />
      <View style={styles.heading}>
        <Text style={[styles.title, { color: colors.text }]}>Aðgangur</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Stillingar og öryggi</Text>
      </View>

      {error ? <ErrorState message={error} onRetry={retry} /> : null}
      {loading && !data ? <LoadingState /> : null}

      <FadeInView>
        <AppCard style={styles.profileCard}>
          <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>{fullName[0].toUpperCase()}</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={[styles.name, { color: colors.text }]}>{fullName}</Text>
            <Text numberOfLines={1} style={[styles.email, { color: colors.textSecondary }]}>{user?.email}</Text>
          </View>
        </AppCard>
      </FadeInView>

      <AppButton label="Breyta nafni" variant="secondary" disabled={loading || !data} onPress={() => { action.clearError(); setName(data?.full_name ?? ''); setEditing(true); }} />

      <FadeInView delay={70} style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Appstillingar</Text>
        <AppCard style={styles.settingsCard}>
          <SettingRow
            icon="chart.pie.fill"
            label="Gjaldmiðill"
            value="ISK"
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingRow
            icon="person.crop.circle.fill"
            label="Útlit"
            value={colorScheme === 'dark' ? 'Dökkt' : 'Ljóst'}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingRow icon="checkmark.circle.fill" label="Útgáfa" value="iPhone prófun" />
        </AppCard>
      </FadeInView>

      <FadeInView delay={130} style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Öryggi</Text>
        <AppCard style={styles.securityCard}>
          <IconSymbol color={colors.positive} name="checkmark.circle.fill" size={22} />
          <View style={styles.securityCopy}>
            <Text style={[styles.securityTitle, { color: colors.text }]}>Varin gögn</Text>
            <Text style={[styles.securityBody, { color: colors.textSecondary }]}>
              Fjármálin þín tengjast þínum aðgangi. Skráðu þig út ef aðrir nota tækið.
            </Text>
          </View>
        </AppCard>
      </FadeInView>

      <AccountTools />
      <AppButton label="Skrá út" onPress={() => { action.clearError(); setConfirmSignOut(true); }} variant="danger" />
      <Text style={[styles.version, { color: colors.textSecondary }]}>Mín Fjármál Mobile · 1.0.0</Text>

      <FormSheet visible={editing} title="Breyta nafni" subtitle="Nafnið birtist í yfirlitinu þínu." onClose={() => setEditing(false)} busy={action.busy}>
        <FormField label="Fullt nafn" value={name} onChangeText={setName} textContentType="name" autoComplete="name" maxLength={100} editable={!action.busy} />
        {action.error ? <InlineNotice message={action.error} /> : null}
        <AppButton label="Vista nafn" loading={action.busy} onPress={() => void save()} />
      </FormSheet>
      <FormSheet visible={confirmSignOut} title="Skrá út?" subtitle="Þú þarft að skrá þig aftur inn til að sjá fjármálin þín á þessu tæki." onClose={() => setConfirmSignOut(false)} busy={action.busy}>
        {action.error ? <InlineNotice message={action.error} /> : null}
        <AppButton label="Já, skrá út" variant="danger" loading={action.busy} onPress={() => void signOut()} />
        <AppButton label="Hætta við" variant="secondary" disabled={action.busy} onPress={() => setConfirmSignOut(false)} />
      </FormSheet>
    </Screen>
  );
}

function SettingRow({ icon, label, value }: { icon: Parameters<typeof IconSymbol>[0]['name']; label: string; value: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.settingRow}>
      <IconSymbol color={colors.primary} name={icon} size={20} />
      <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.settingValue, { color: colors.textSecondary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 4 },
  title: { fontSize: 30, fontWeight: '900' },
  subtitle: { fontSize: 13, fontWeight: '600' },
  profileCard: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  avatar: { alignItems: 'center', borderRadius: 24, height: 48, justifyContent: 'center', width: 48 },
  avatarText: { fontSize: 19, fontWeight: '900' },
  profileCopy: { flex: 1, gap: 4, minWidth: 0 },
  name: { fontSize: 17, fontWeight: '900' },
  email: { fontSize: 13 },
  section: { gap: 11 },
  sectionTitle: { fontSize: 19, fontWeight: '900' },
  settingsCard: { paddingBottom: 4, paddingTop: 4 },
  settingRow: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 54 },
  settingLabel: { flex: 1, fontSize: 14, fontWeight: '700' },
  settingValue: { fontSize: 13, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth },
  securityCard: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  securityCopy: { flex: 1, gap: 4 },
  securityTitle: { fontSize: 14, fontWeight: '800' },
  securityBody: { fontSize: 12, lineHeight: 18 },
  version: { fontSize: 11, textAlign: 'center' },
});
