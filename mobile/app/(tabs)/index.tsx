import { router } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { CashFlowChart } from '@/components/cash-flow-chart';
import { FadeInView } from '@/components/fade-in-view';
import { Screen } from '@/components/screen';
import { TransactionRow } from '@/components/transaction-row';
import { AppCard } from '@/components/ui/app-card';
import { InlineNotice } from '@/components/ui/finance-form';
import { MetricCard } from '@/components/ui/metric-card';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state-view';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useRefreshableData } from '@/hooks/use-refreshable-data';
import { fetchDashboard } from '@/lib/finance-data';
import { formatISK, monthLabel } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';

export default function DashboardScreen() {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const userId = user!.id;
  const loadDashboard = useCallback(() => fetchDashboard(userId), [userId]);
  const { data, error, loading, refresh, refreshing, retry } = useRefreshableData(loadDashboard);

  const fallbackName = user?.user_metadata?.full_name as string | undefined;
  const fullName = data?.profile?.full_name || fallbackName;
  const firstName = fullName?.trim().split(/\s+/)[0];

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <View style={styles.topBar}>
        <BrandMark />
        <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {(firstName?.[0] || user?.email?.[0] || 'M').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.heading}>
        <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>Góðan dag{firstName ? `, ${firstName}` : ''}</Text>
        <Text style={[styles.title, { color: colors.text }]}>Fjármálin í dag</Text>
        <Text style={[styles.month, { color: colors.textSecondary }]}>
          {data ? capitalize(monthLabel(data.monthKey)) : 'Núverandi mánuður'}
        </Text>
      </View>

      {loading && !data ? (
        <AppCard>
          <LoadingState label="Sæki nýjustu stöðuna..." />
        </AppCard>
      ) : error && !data ? (
        <AppCard>
          <ErrorState message={error} onRetry={retry} />
        </AppCard>
      ) : data ? (
        <>
          {error ? <InlineNotice message={`${error} Dragðu niður til að endurhlaða.`} /> : null}
          <FadeInView>
            <View style={styles.metrics}>
              <MetricCard
                icon="arrow.down.right"
                label="Heildartekjur"
                onPress={() => router.push('/transactions')}
                tone="positive"
                value={formatISK(data.income)}
              />
              <MetricCard
                icon="arrow.up.right"
                label="Heildarútgjöld"
                onPress={() => router.push('/transactions')}
                tone="negative"
                value={formatISK(data.expenses)}
              />
              <MetricCard
                icon="wallet.bifold.fill"
                label="Eftir mánuðinn"
                tone={data.balance >= 0 ? 'positive' : 'negative'}
                value={formatISK(data.balance)}
              />
              <MetricCard
                icon="banknote.fill"
                label="Heildarsparnaður"
                onPress={() => router.push('/savings')}
                value={formatISK(data.savings)}
              />
            </View>
          </FadeInView>

          <FadeInView delay={70}>
            <SectionHeader title="Tekjur og útgjöld" subtitle="Síðustu sex mánuðir" />
            <AppCard style={styles.chartCard}>
              <CashFlowChart data={data.trend} />
            </AppCard>
          </FadeInView>

          <FadeInView delay={140}>
            <SectionHeader
              actionLabel="Sjá allar"
              onAction={() => router.push('/transactions')}
              title="Nýlegar færslur"
            />
            <AppCard style={styles.listCard}>
              {data.recentTransactions.length ? (
                data.recentTransactions.map((transaction) => (
                  <TransactionRow key={transaction.id} transaction={transaction} />
                ))
              ) : (
                <EmptyState label="Engar færslur hafa verið skráðar enn." />
              )}
            </AppCard>
          </FadeInView>
        </>
      ) : null}
    </Screen>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '900',
  },
  heading: {
    gap: 4,
    paddingBottom: 2,
  },
  eyebrow: {
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0,
  },
  month: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chartCard: {
    marginTop: 11,
  },
  listCard: {
    marginTop: 11,
    paddingBottom: 0,
    paddingTop: 0,
  },
});
