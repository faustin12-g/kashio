import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../components/Screen';
import { CategoryDonutChart } from '../../components/CategoryDonutChart';
import { TransactionRow } from '../../components/TransactionRow';
import { EmptyState } from '../../components/EmptyState';
import { useTheme, spacing } from '../../constants/theme';
import { useTransactionsStore } from '../../store/transactionsStore';
import { useCategoriesStore } from '../../store/categoriesStore';
import { useBudgetsStore } from '../../store/budgetsStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useSyncStore } from '../../store/syncStore';
import { formatMoney } from '../../utils/money';
import { currentPeriodRange, todayIso } from '../../utils/date';
import { sumByCategory } from '../../repositories/transactionsRepository';

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();

  const transactions = useTransactionsStore((state) => state.transactions);
  const loadTransactions = useTransactionsStore((state) => state.load);
  const categories = useCategoriesStore((state) => state.categories);
  const budgetProgress = useBudgetsStore((state) => state.progress);
  const loadBudgets = useBudgetsStore((state) => state.load);
  const currency = useSettingsStore((state) => state.currency);
  const sync = useSyncStore();

  const [monthTotals, setMonthTotals] = React.useState<{ categoryId: string | null; totalMinor: number }[]>([]);
  const [monthSpent, setMonthSpent] = React.useState(0);

  const { start, end } = useMemo(() => currentPeriodRange('monthly', todayIso()), []);

  const refresh = useCallback(async () => {
    await Promise.all([
      loadTransactions(db, { from: start, to: end }),
      loadBudgets(db),
      sumByCategory(db, { from: start, to: end, type: 'expense' }).then((totals) => {
        setMonthTotals(totals);
        setMonthSpent(totals.reduce((sum, entry) => sum + entry.totalMinor, 0));
      }),
    ]);
  }, [db, start, end, loadTransactions, loadBudgets]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  const donutSegments = useMemo(
    () =>
      monthTotals
        .filter((entry) => entry.categoryId && entry.totalMinor > 0)
        .map((entry) => {
          const category = categoryById.get(entry.categoryId!);
          return {
            id: entry.categoryId!,
            label: category?.name ?? 'Uncategorized',
            color: category?.color ?? theme.textMuted,
            valueMinor: entry.totalMinor,
          };
        })
        .sort((a, b) => b.valueMinor - a.valueMinor),
    [monthTotals, categoryById, theme.textMuted]
  );

  const recentTransactions = transactions.slice(0, 5);

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.greeting, { color: theme.textMuted }]}>This month</Text>
          <Text style={[styles.total, { color: theme.text }]}>{formatMoney(monthSpent, currency)}</Text>
        </View>
        <Pressable
          onPress={() => router.push('/settings')}
          style={[styles.syncBadge, { backgroundColor: sync.account ? theme.surfaceAlt : theme.warning + '22' }]}
        >
          <Text style={{ fontSize: 12, color: sync.account ? theme.textMuted : theme.warning, fontWeight: '600' }}>
            {sync.account ? '☁️ Synced' : '⚠️ Not backed up'}
          </Text>
        </Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <CategoryDonutChart segments={donutSegments} currency={currency} />
        {donutSegments.length > 0 && (
          <View style={styles.legend}>
            {donutSegments.slice(0, 6).map((segment) => (
              <View key={segment.id} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
                <Text style={[styles.legendLabel, { color: theme.text }]} numberOfLines={1}>
                  {segment.label}
                </Text>
                <Text style={{ color: theme.textMuted, fontSize: 13 }}>
                  {formatMoney(segment.valueMinor, currency)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {budgetProgress.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Budgets</Text>
            <Link href="/budgets" style={{ color: theme.primary, fontSize: 13, fontWeight: '600' }}>
              See all
            </Link>
          </View>
          {budgetProgress.slice(0, 2).map((progress) => {
            const overPercent = progress.percentUsed > 100;
            return (
              <View
                key={progress.budget.id}
                style={[styles.budgetMini, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <Text style={{ color: theme.text, fontWeight: '600' }}>
                  {progress.budget.categoryId
                    ? (categoryById.get(progress.budget.categoryId)?.name ?? 'Category')
                    : 'Overall'}
                </Text>
                <Text style={{ color: overPercent ? theme.danger : theme.textMuted, fontWeight: '600' }}>
                  {Math.round(progress.percentUsed)}%
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent activity</Text>
          <Link href="/transactions" style={{ color: theme.primary, fontSize: 13, fontWeight: '600' }}>
            See all
          </Link>
        </View>
        {recentTransactions.length === 0 ? (
          <EmptyState icon="💸" title="No transactions this month" message="Tap the + button to add your first one." />
        ) : (
          <View style={{ gap: 8 }}>
            {recentTransactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                category={transaction.categoryId ? (categoryById.get(transaction.categoryId) ?? null) : null}
                onPress={() => router.push(`/transactions/${transaction.id}`)}
              />
            ))}
          </View>
        )}
      </View>

      <Pressable
        onPress={() => router.push('/transactions/new')}
        style={[styles.fab, { backgroundColor: theme.primary }]}
        accessibilityRole="button"
        accessibilityLabel="Add transaction"
      >
        <Text style={styles.fabLabel}>+</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  total: { fontSize: 34, fontWeight: '800', marginTop: 2 },
  syncBadge: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  card: { borderRadius: 16, borderWidth: 1, padding: spacing.lg, alignItems: 'center', gap: spacing.md },
  legend: { width: '100%', gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 13 },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  budgetMini: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
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
  fabLabel: { color: '#FFFFFF', fontSize: 28, fontWeight: '700', marginTop: -2 },
});
