import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FadeInView } from '@/components/fade-in-view';
import { Screen } from '@/components/screen';
import { EditableSavingsBucket, savingsBucketDefaults, SavingsBucketEditor, SavingsGoalEditor } from '@/components/savings-manager';
import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { InlineNotice } from '@/components/ui/finance-form';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state-view';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useRefreshableData } from '@/hooks/use-refreshable-data';
import { fetchSavings } from '@/lib/finance-data';
import { formatDate, formatISK } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { SavingsPreferencesEditor } from '@/components/savings-preferences-editor';
import { defaultSavingsPreferences, savingsTotal } from '@/lib/savings-preferences';

export default function SavingsScreen() {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const userId = user!.id;
  const loadSavings = useCallback(() => fetchSavings(userId), [userId]);
  const { data, error, loading, refresh, refreshing, retry } = useRefreshableData(loadSavings);
  const [editingBucket, setEditingBucket] = useState<EditableSavingsBucket | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingPreferences, setEditingPreferences] = useState(false);
  const preferences = data?.preferences ?? defaultSavingsPreferences();
  const total = savingsTotal(data?.buckets ?? []);
  const housing = savingsTotal(data?.buckets ?? [], preferences.housing);
  const goalBalance = savingsTotal(data?.buckets ?? [], preferences.goal);
  const editingGoal = data?.goals.find((goal) => goal.id === editingGoalId) ?? null;
  const buckets = preferences.order.map((type) => ({ ...savingsBucketDefaults.find((item) => item.bucket_type === type)!, amount: 0, ...data?.buckets.find((bucket) => bucket.bucket_type === type) }));

  return (
    <>
      <Screen onRefresh={refresh} refreshing={refreshing}>
        <View style={styles.heading}>
          <Text style={[styles.title, { color: colors.text }]}>Sparnaður</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Staðan þín og næstu markmið.</Text>
        </View>
        <FadeInView>
          <AppCard style={[styles.hero, { backgroundColor: colors.primary }]}>
            <View style={styles.heroIcon}><IconSymbol color="#FFFFFF" name="banknote.fill" size={24} weight="semibold" /></View>
            <Text style={styles.heroLabel}>Heildarsparnaður</Text>
            <Text adjustsFontSizeToFit numberOfLines={1} style={styles.heroValue}>{data ? formatISK(total) : '—'}</Text>
            <Text style={styles.heroHint}>Samanlögð staða sparnaðarflokka</Text>
          </AppCard>
        </FadeInView>
        {error && data ? <InlineNotice message={error} /> : null}
        {loading && !data ? <AppCard><LoadingState /></AppCard> : error && !data ? <AppCard><ErrorState message={error} onRetry={retry} /></AppCard> : data ? (
          <>
            <AppCard><Text style={[styles.subtitle, { color: colors.textSecondary }]}>Húsnæðissparnaður</Text><Text style={[styles.goalAmount, { color: colors.text }]}>{formatISK(housing)}</Text><Text style={[styles.subtitle, { color: colors.textSecondary }]}>Annar sparnaður: {formatISK(total - housing)}</Text></AppCard>
            <AppButton label="Skipting sparnaðar" variant="secondary" onPress={() => setEditingPreferences(true)} />
            <FadeInView delay={70} style={styles.section}>
              <View style={styles.sectionHeading}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Sparnaðarflokkar</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Veldu flokk til að skrá framlag eða uppfæra stöðuna.</Text>
              </View>
              <View style={styles.bucketGrid}>
                {buckets.map((bucket) => (
                  <AppCard key={bucket.bucket_type} style={styles.bucketCard} accessibilityLabel={`${bucket.label}, ${formatISK(bucket.amount)}. Uppfæra stöðu.`} onPress={() => setEditingBucket(bucket)}>
                    <View style={styles.bucketHeading}>
                      <Text style={[styles.bucketLabel, { color: colors.textSecondary }]}>{bucket.label}</Text>
                      <IconSymbol name="chevron.right" size={12} color={colors.textSecondary} />
                    </View>
                    <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.bucketValue, { color: colors.text }]}>{formatISK(bucket.amount)}</Text>
                  </AppCard>
                ))}
              </View>
            </FadeInView>
            <FadeInView delay={140} style={styles.section}>
              <View style={styles.sectionHeading}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Markmið</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Viðmið markmiða: {formatISK(goalBalance)} í völdum flokkum. Sama sparnaðarstaða er borin saman við hvert markmið.</Text>
              </View>
              <AppButton label="Nýtt sparnaðarmarkmið" onPress={() => setEditingGoalId('new')} />
              {data.goals.length ? (
                <View style={styles.goalList}>
                  {data.goals.map((goal) => {
                    const reached = goal.target_amount > 0 && goalBalance >= goal.target_amount;
                    const percent = goal.target_amount > 0 ? Math.floor(goalBalance / goal.target_amount * 100) : 0;
                    const progress = Math.min(100, Math.max(0, percent));
                    return (
                      <AppCard key={goal.id} style={styles.goalCard} onPress={() => setEditingGoalId(goal.id)} accessibilityLabel={`${goal.title}, ${formatISK(goalBalance)} af ${formatISK(goal.target_amount)}. Opna markmið.`}>
                        <View style={styles.goalHeader}>
                          <Text style={[styles.goalTitle, { color: colors.text }]}>{goal.title}</Text>
                          <IconSymbol name="chevron.right" color={colors.textSecondary} size={14} />
                        </View>
                        <View style={styles.goalAmounts}>
                          <Text style={[styles.goalAmount, { color: colors.text }]}>{formatISK(goalBalance)}</Text>
                          <Text style={[styles.goalMeta, { color: colors.textSecondary }]}>af {formatISK(goal.target_amount)}</Text>
                        </View>
                        <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
                          <View style={[styles.progress, { backgroundColor: reached ? colors.positive : colors.primary, width: `${progress}%` }]} />
                        </View>
                        <Text style={[styles.goalMeta, { color: reached ? colors.positive : colors.textSecondary }]}>
                          {reached ? 'Markmiði náð' : `${percent}% komið`}{goal.target_date ? ` · ${formatDate(goal.target_date)} ${goal.target_date.slice(0, 4)}` : ''}
                        </Text>
                      </AppCard>
                    );
                  })}
                </View>
              ) : <AppCard><EmptyState label="Veldu þitt fyrsta markmið og fylgstu með framförunum hér." /></AppCard>}
            </FadeInView>
          </>
        ) : null}
      </Screen>
      {editingBucket ? <SavingsBucketEditor key={editingBucket.bucket_type} userId={userId} bucket={editingBucket} onClose={() => setEditingBucket(null)} onSaved={() => { setEditingBucket(null); void refresh(); }} /> : null}
      {editingGoalId && (editingGoalId === 'new' || editingGoal) ? <SavingsGoalEditor key={editingGoalId} userId={userId} goal={editingGoal} currentAmount={goalBalance} onClose={() => setEditingGoalId(null)} onChanged={() => { void refresh(); }} /> : null}
      {editingPreferences && data ? <SavingsPreferencesEditor userId={userId} preferences={data.preferences} buckets={buckets} onClose={() => setEditingPreferences(false)} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 5 },
  title: { fontSize: 30, fontWeight: '900' },
  subtitle: { fontSize: 13, lineHeight: 19 },
  hero: { borderWidth: 0, gap: 8, minHeight: 180 },
  heroIcon: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 8, height: 42, justifyContent: 'center', marginBottom: 8, width: 42 },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700' },
  heroValue: { color: '#FFFFFF', fontSize: 30, fontVariant: ['tabular-nums'], fontWeight: '900' },
  heroHint: { color: 'rgba(255,255,255,0.85)', fontSize: 11, lineHeight: 17 },
  section: { gap: 12 },
  sectionHeading: { gap: 4 },
  sectionTitle: { fontSize: 19, fontWeight: '900' },
  bucketGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  bucketCard: { flexBasis: '47%', flexGrow: 1, gap: 12, minWidth: 140 },
  bucketHeading: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  bucketLabel: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  bucketValue: { fontSize: 18, fontVariant: ['tabular-nums'], fontWeight: '900' },
  goalList: { gap: 12 },
  goalCard: { gap: 12 },
  goalHeader: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  goalTitle: { flex: 1, fontSize: 16, fontWeight: '800' },
  goalAmounts: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 },
  goalAmount: { fontSize: 22, fontVariant: ['tabular-nums'], fontWeight: '800' },
  track: { borderRadius: 4, height: 7, overflow: 'hidden' },
  progress: { borderRadius: 4, height: '100%' },
  goalMeta: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
});
