import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
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
import { sumsByType } from '../../repositories/transactionsRepository';
import {
  EMPTY_FILTER,
  activeFilterCount,
  buildTransactionFilter,
  isFilterActive,
  type DatePreset,
  type FilterState,
} from '../../services/txFilter';
import { todayIso } from '../../utils/date';
import { fonts } from '../../constants/fonts';

export default function TransactionsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const money = useMoney();
  const router = useRouter();
  const db = useSQLiteContext();
  // Arriving from Home's Income/Spent tiles pre-filters to that type and period.
  const params = useLocalSearchParams<{ type?: string; datePreset?: string }>();
  const transactions = useTransactionsStore((state) => state.transactions);
  const loadTransactions = useTransactionsStore((state) => state.load);
  const categories = useCategoriesStore((state) => state.categories);

  const [filterState, setFilterState] = useState<FilterState>(() => {
    if (params.type !== 'income' && params.type !== 'expense') return EMPTY_FILTER;
    const validPresets: DatePreset[] = ['week', 'month', 'year'];
    const datePreset = validPresets.includes(params.datePreset as DatePreset)
      ? (params.datePreset as DatePreset)
      : 'month';
    return { ...EMPTY_FILTER, type: params.type, datePreset };
  });
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
      sumsByType(db, filter).then(setTotals);
    }, [db, filter, loadTransactions])
  );

  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const activeCount = activeFilterCount(filterState);
  const filtered = isFilterActive(filterState);
  const balanceMinor = totals.incomeMinor - totals.expenseMinor;

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

      <View style={styles.summaryRow}>
        <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: fonts.semibold }}>
          {filtered
            ? transactions.length === 1
              ? t('tx.resultOne')
              : t('tx.resultCount', { count: transactions.length })
            : transactions.length === 1
              ? t('tx.totalOne')
              : t('tx.totalCount', { count: transactions.length })}
        </Text>
        <View style={styles.totalsRow}>
          <View style={styles.totalItem}>
            <Icon name="tray-arrow-down" size={14} color={theme.income} />
            <Text style={{ color: theme.income, fontFamily: fonts.bold, fontSize: 13 }} numberOfLines={1}>
              {money(totals.incomeMinor)}
            </Text>
          </View>
          <View style={styles.totalItem}>
            <Icon name="tray-arrow-up" size={14} color={theme.expense} />
            <Text style={{ color: theme.expense, fontFamily: fonts.bold, fontSize: 13 }} numberOfLines={1}>
              {money(totals.expenseMinor)}
            </Text>
          </View>
          <View style={styles.totalItem}>
            <Icon name="scale-balance" size={14} color={balanceMinor < 0 ? theme.danger : theme.text} />
            <Text
              style={{ color: balanceMinor < 0 ? theme.danger : theme.text, fontFamily: fonts.bold, fontSize: 13 }}
              numberOfLines={1}
            >
              {money(balanceMinor)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const fabNode = (
    <Pressable
      onPress={() => router.push('/transactions/new')}
      style={[styles.fab, { backgroundColor: theme.primary }]}
      accessibilityRole="button"
      accessibilityLabel={t('home.addTransaction')}
    >
      <Icon name="plus" size={28} color="#FFFFFF" />
    </Pressable>
  );

  return (
    <Screen scroll={false} overlay={fabNode}>
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
  badgeText: { color: '#FFFFFF', fontSize: 11, fontFamily: fonts.extrabold },
  summaryRow: { gap: 6 },
  totalsRow: { flexDirection: 'row', gap: 14 },
  totalItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
});
