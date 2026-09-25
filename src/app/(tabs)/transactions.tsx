import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../components/Screen';
import { TransactionRow } from '../../components/TransactionRow';
import { TransactionFilterSheet } from '../../components/TransactionFilterSheet';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { useTheme } from '../../constants/theme';
import { useMoney } from '../../hooks/useMoney';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useTranslation } from '../../i18n/useTranslation';
import { useTransactionsStore } from '../../store/transactionsStore';
import { useCategoriesStore } from '../../store/categoriesStore';
import { useAccountsStore } from '../../store/accountsStore';
import { sumsByType } from '../../repositories/transactionsRepository';
import {
  EMPTY_FILTER,
  activeFilterCount,
  buildTransactionFilter,
  isFilterActive,
  type FilterState,
} from '../../services/txFilter';
import { todayIso } from '../../utils/date';

export default function TransactionsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const money = useMoney();
  const router = useRouter();
  const db = useSQLiteContext();
  const transactions = useTransactionsStore((state) => state.transactions);
  const loadTransactions = useTransactionsStore((state) => state.load);
  const categories = useCategoriesStore((state) => state.categories);
  const accounts = useAccountsStore((state) => state.accounts);
  const loadAccounts = useAccountsStore((state) => state.load);

  const [filterState, setFilterState] = useState<FilterState>(EMPTY_FILTER);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [totals, setTotals] = useState({ incomeMinor: 0, expenseMinor: 0 });

  // The list follows the search box after a short pause, not on every key press.
  const debouncedSearch = useDebouncedValue(filterState.search, 250);
  const filter = useMemo(
    () => buildTransactionFilter({ ...filterState, search: debouncedSearch }, todayIso()),
    [filterState, debouncedSearch]
  );

  useFocusEffect(
    useCallback(() => {
      loadTransactions(db, filter);
      loadAccounts(db);
      sumsByType(db, filter).then(setTotals);
    }, [db, filter, loadTransactions, loadAccounts])
  );

  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const accountById = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);
  const activeCount = activeFilterCount(filterState);
  const filtered = isFilterActive(filterState);

  const header = (
    <View style={styles.header}>
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Icon name="magnify" size={20} color={theme.textMuted} />
          <TextInput
            value={filterState.search}
            onChangeText={(search) => setFilterState((current) => ({ ...current, search }))}
            placeholder={t('tx.searchPlaceholder')}
            placeholderTextColor={theme.textMuted}
            autoCorrect={false}
            style={[styles.searchInput, { color: theme.text }]}
          />
          {filterState.search.length > 0 && (
            <Pressable
              onPress={() => setFilterState((current) => ({ ...current, search: '' }))}
              hitSlop={10}
              accessibilityLabel={t('common.clear')}
            >
              <Icon name="close-circle" size={18} color={theme.textMuted} />
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => setSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('tx.filters')}
          style={[
            styles.filterButton,
            {
              backgroundColor: activeCount > 0 ? theme.primary : theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <Icon name="filter-variant" size={22} color={activeCount > 0 ? theme.primaryText : theme.text} />
          {activeCount > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.danger }]}>
              <Text style={styles.badgeText}>{activeCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {filtered && (
        <View style={styles.summaryRow}>
          <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: '600' }}>
            {transactions.length === 1 ? t('tx.resultOne') : t('tx.resultCount', { count: transactions.length })}
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 13 }} numberOfLines={1}>
            <Text style={{ color: theme.income, fontWeight: '700' }}>+{money(totals.incomeMinor)}</Text>
            {'   '}
            <Text style={{ color: theme.expense, fontWeight: '700' }}>−{money(totals.expenseMinor)}</Text>
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <Screen scroll={false}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <TransactionRow
            transaction={item}
            category={item.categoryId ? (categoryById.get(item.categoryId) ?? null) : null}
            account={item.accountId ? (accountById.get(item.accountId) ?? null) : null}
            onPress={() => router.push(`/transactions/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          filtered ? (
            <EmptyState icon="magnify-close" title={t('tx.noMatches')} message={t('tx.noMatchesHint')} />
          ) : (
            <EmptyState icon="receipt-text-outline" title={t('tx.empty')} message={t('tx.emptyHint')} />
          )
        }
      />

      <TransactionFilterSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        state={filterState}
        onChange={setFilterState}
        categories={categories.filter((category) => !category.isArchived)}
        accounts={accounts}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  header: { gap: 10, marginBottom: 12 },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15 },
  filterButton: {
    width: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
});
