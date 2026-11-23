import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/ui/app-button';
import { FormField, FormSheet, InlineNotice } from '@/components/ui/finance-form';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useFormAction } from '@/hooks/use-form-action';
import { deletionRequestedAt, exportAccountData, setDeletionRequest } from '@/lib/account-data';
import { authErrorMessage } from '@/lib/auth-errors';
import { authRedirectUrl } from '@/lib/auth-links';
import { openPublicLink } from '@/lib/public-links';
import { shareAccountExport } from '@/lib/share-export';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useFeedback } from '@/providers/feedback-provider';

export function AccountTools() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const action = useFormAction();
  const notify = useFeedback();
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const requestedAt = deletionRequestedAt(user?.user_metadata?.account_deletion_request);
  return <View style={styles.section}>
    <Text style={[styles.heading, { color: colors.text }]}>Gögn og aðstoð</Text>
    {action.error && !deleting ? <InlineNotice message={action.error} /> : null}
    {action.busy && !deleting ? <ActivityIndicator accessibilityLabel="Vinn úr beiðni" color={colors.primary} /> : null}
    <AppButton label="Sækja gögnin mín" variant="secondary" disabled={action.busy} onPress={() => void action.run(async () => { const data = await exportAccountData(user!.id); await shareAccountExport(data); })} />
    <Text style={[styles.body, { color: colors.textSecondary }]}>Sæktu afrit af færslum, reikningum, sparnaði og aðgangsupplýsingum sem JSON-skrá. Þú velur sjálfur hvar hún er vistuð.</Text>
    <AppButton label="Endurstilla lykilorð" variant="secondary" disabled={action.busy} onPress={() => void action.run(async () => {
      if (!user?.email) throw new Error('Netfang aðgangsins fannst ekki.');
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: authRedirectUrl('reset-password') });
      if (error) throw new Error(authErrorMessage(error));
      notify('Endurstillingarpóstur var sendur. Opnaðu nýjasta tengilinn á þessum síma.');
    })} />
    <AppButton label="Persónuvernd" variant="secondary" disabled={action.busy} onPress={() => void action.run(() => openPublicLink('privacy'))} />
    <AppButton label="Leiðbeiningar" variant="secondary" disabled={action.busy} onPress={() => void action.run(() => openPublicLink('help'))} />
    <AppButton label="Hafa samband" variant="secondary" disabled={action.busy} onPress={() => void action.run(() => openPublicLink('support'))} />
    {requestedAt ? <>
      <Text style={[styles.body, { color: colors.textSecondary }]}>Beiðni um eyðingu var skráð {new Date(requestedAt).toLocaleDateString('is-IS')}. Aðganginum hefur ekki verið eytt. Umsjónarmaður afgreiðir beiðnina; þú getur haft samband hér að ofan.</Text>
      <AppButton label="Afturkalla eyðingarbeiðni" variant="secondary" disabled={action.busy} onPress={async () => { if (await action.run(() => setDeletionRequest(user!.id, null))) notify('Eyðingarbeiðnin var afturkölluð.'); }} />
    </> : <AppButton label="Óska eftir eyðingu aðgangs" variant="danger" disabled={action.busy} onPress={() => { action.clearError(); setConfirmation(''); setDeleting(true); }} />}
    <FormSheet visible={deleting} title="Óska eftir eyðingu aðgangs" onClose={() => setDeleting(false)} busy={action.busy}>
      <Text style={[styles.body, { color: colors.text }]}>Beiðnin er skráð á aðganginn og umsjónarmaður sér um eyðinguna. Gögnin eyðast ekki strax. Þú getur afturkallað beiðnina á meðan hún bíður afgreiðslu.</Text>
      <FormField label="Skrifaðu EYÐA til að staðfesta" value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters" autoCorrect={false} editable={!action.busy} />
      {action.error ? <InlineNotice message={action.error} /> : null}
      <AppButton label="Skrá eyðingarbeiðni" variant="danger" loading={action.busy} onPress={async () => { if (await action.run(() => setDeletionRequest(user!.id, confirmation))) { setDeleting(false); notify('Eyðingarbeiðnin var skráð. Aðganginum hefur ekki verið eytt enn.'); } }} />
    </FormSheet>
  </View>;
}
const styles = StyleSheet.create({ section: { gap: 12 }, heading: { fontSize: 19, fontWeight: '800' }, body: { fontSize: 13, lineHeight: 20 } });
