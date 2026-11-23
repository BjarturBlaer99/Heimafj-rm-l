import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TransactionEditor } from '@/components/transaction-editor';
import { TransactionRow } from '@/components/transaction-row';
import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { ChoiceChips, FormField, InlineNotice, MonthPicker } from '@/components/ui/finance-form';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state-view';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useRefreshableData } from '@/hooks/use-refreshable-data';
import { fetchTransactionMonth, selectTransactionPage } from '@/lib/finance-data';
import { formatISK, monthKey } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import type { Transaction, TransactionType } from '@/types/finance';

type Filter = 'all' | TransactionType;

export default function TransactionsScreen() {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const userId = user!.id;
  const [filter, setFilter] = useState<Filter>('all');
  const [month, setMonth] = useState(monthKey);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(50);
  const [editor, setEditor] = useState<Transaction | 'new' | null>(null);
  useEffect(() => { const timer = setTimeout(() => { setQuery(search.trim()); setLimit(50); }, 300); return () => clearTimeout(timer); }, [search]);
  const loadTransactions = useCallback(() => fetchTransactionMonth(userId, month), [userId, month]);
  const { data: rows, error, loading, refresh, refreshing, retry } = useRefreshableData(loadTransactions);
  const data = useMemo(() => rows ? selectTransactionPage(rows, { type: filter, search: query, limit }) : null, [rows, filter, query, limit]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <FlatList
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        data={data?.items ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl colors={[colors.primary]} onRefresh={refresh} refreshing={refreshing} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <AppCard accessibilityLabel={`Breyta færslu: ${item.note || item.categories?.name || 'Óflokkað'}, ${formatISK(item.amount)}`} onPress={() => setEditor(item)} style={styles.rowCard}>
            <TransactionRow transaction={item} />
          </AppCard>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <View style={styles.heading}>
              <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Færslur</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Tekjur og útgjöld á einum stað</Text>
            </View>
            <AppButton label="Ný færsla" onPress={() => setEditor('new')} />
            <MonthPicker value={month} onChange={(next) => { setMonth(next); setLimit(50); }} />
            <View style={styles.totalRow}>
              <AppCard style={styles.totalCard}>
                <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Tekjur mánaðarins</Text>
                <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.totalValue, { color: colors.positive }]}>{data ? formatISK(data.income) : '—'}</Text>
              </AppCard>
              <AppCard style={styles.totalCard}>
                <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Útgjöld mánaðarins</Text>
                <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.totalValue, { color: colors.negative }]}>{data ? formatISK(data.expenses) : '—'}</Text>
              </AppCard>
            </View>
            <FormField label="Leita í færslum" placeholder="Lýsing eða flokkur" value={search} onChangeText={setSearch} clearButtonMode="while-editing" autoCorrect={false} returnKeyType="search" />
            <ChoiceChips value={filter} onChange={(next) => { setFilter(next as Filter); setLimit(50); }} options={[{ value: 'all', label: 'Allt' }, { value: 'income', label: 'Tekjur' }, { value: 'expense', label: 'Útgjöld' }]} />
            {error && data ? <InlineNotice message={`${error} Dragðu niður til að reyna aftur.`} /> : null}
            {data?.items.length ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Sýni {data.items.length} færslur · Ýttu á færslu til að breyta</Text> : null}
          </View>
        }
        ListEmptyComponent={loading ? <AppCard><LoadingState /></AppCard> : error ? <AppCard><ErrorState message={error} onRetry={retry} /></AppCard> : <AppCard><EmptyState label={query ? 'Engar færslur fundust. Prófaðu annað leitarorð.' : 'Engar færslur passa við valinn mánuð og tegund.'} /></AppCard>}
        ListFooterComponent={data?.hasMore ? <View style={styles.loadMore}><AppButton label="Sýna fleiri færslur" variant="secondary" loading={loading} onPress={() => setLimit((value) => value + 50)} /></View> : undefined}
        showsVerticalScrollIndicator={false}
      />
      {editor ? <TransactionEditor transaction={editor === 'new' ? undefined : editor} userId={userId} onClose={() => setEditor(null)} onSaved={(_message, savedMonth) => { setEditor(null); if (savedMonth) { setMonth(savedMonth); setFilter('all'); setSearch(''); setQuery(''); setLimit(50); } }} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { alignSelf: 'center', maxWidth: 720, paddingBottom: 32, paddingHorizontal: 18, paddingTop: 12, width: '100%' },
  headerContent: { gap: 16, marginBottom: 18 },
  heading: { gap: 4 },
  title: { fontSize: 30, fontWeight: '900' },
  subtitle: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
  totalRow: { flexDirection: 'row', gap: 12 },
  totalCard: { flex: 1, gap: 7, minWidth: 0 },
  totalLabel: { fontSize: 12, fontWeight: '700' },
  totalValue: { fontSize: 18, fontVariant: ['tabular-nums'], fontWeight: '900' },
  rowCard: { paddingBottom: 0, paddingTop: 0 },
  separator: { height: 10 },
  loadMore: { marginTop: 18 },
});
