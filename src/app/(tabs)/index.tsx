import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../components/Screen';
import { CategoryDonutChart } from '../../components/CategoryDonutChart';
import { SummaryCard, type SummaryPeriod } from '../../components/SummaryCard';
import { BudgetProgressCard } from '../../components/BudgetProgressCard';
import { TransactionRow } from '../../components/TransactionRow';
import { EmptyState } from '../../components/EmptyState';
import { Icon, type IconName } from '../../components/Icon';
import { useTheme, spacing } from '../../constants/theme';
import { useMoney } from '../../hooks/useMoney';
import { categoryDisplayName } from '../../i18n';
import { useTranslation } from '../../i18n/useTranslation';
import { useTransactionsStore } from '../../store/transactionsStore';
import { useCategoriesStore } from '../../store/categoriesStore';
import { useBudgetsStore } from '../../store/budgetsStore';
import { useAccountsStore } from '../../store/accountsStore';
import { useRecurringStore } from '../../store/recurringStore';
import { useSyncStore } from '../../store/syncStore';
import { buildSummary, getSummary, type Summary } from '../../services/summary';
import { currentPeriodRange, todayIso } from '../../utils/date';
import { sumByCategory } from '../../repositories/transactionsRepository';

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const money = useMoney();

  const transactions = useTransactionsStore((state) => state.transactions);
  const loadTransactions = useTransactionsStore((state) => state.load);
  const categories = useCategoriesStore((state) => state.categories);
  const budgetProgress = useBudgetsStore((state) => state.progress);
  const loadBudgets = useBudgetsStore((state) => state.load);
  const accounts = useAccountsStore((state) => state.accounts);
  const balances = useAccountsStore((state) => state.balances);
  const loadAccounts = useAccountsStore((state) => state.load);
  const syncAccount = useSyncStore((state) => state.account);
  const dueCount = useRecurringStore((state) => state.dueItems.length);
  const loadRecurring = useRecurringStore((state) => state.load);

  const [monthTotals, setMonthTotals] = React.useState<{ categoryId: string | null; totalMinor: number }[]>([]);
  const [summaryPeriod, setSummaryPeriod] = React.useState<SummaryPeriod>('all');
  const [summaries, setSummaries] = React.useState<Record<SummaryPeriod, Summary>>({
    all: buildSummary(0, 0),
    month: buildSummary(0, 0),
  });

  const { start, end } = useMemo(() => currentPeriodRange('monthly', todayIso()), []);

  const refresh = useCallback(async () => {
    await Promise.all([
      loadTransactions(db, { from: start, to: end }),
      loadBudgets(db),
      loadAccounts(db),
      loadRecurring(db),
      sumByCategory(db, { from: start, to: end, type: 'expense' }).then(setMonthTotals),
      Promise.all([
        getSummary(db, {}, { includeOpeningBalance: true }),
        getSummary(db, { from: start, to: end }),
      ]).then(([all, month]) => setSummaries({ all, month })),
    ]);
  }, [db, start, end, loadTransactions, loadBudgets, loadAccounts, loadRecurring]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const accountById = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);

  const donutSegments = useMemo(
    () =>
      monthTotals
        .filter((entry) => entry.categoryId && entry.totalMinor > 0)
        .map((entry) => {
          const category = categoryById.get(entry.categoryId!);
          return {
            id: entry.categoryId!,
            label: category ? categoryDisplayName(category.name, t) : t('tx.uncategorized'),
            color: category?.color ?? theme.textMuted,
            valueMinor: entry.totalMinor,
          };
        })
        .sort((a, b) => b.valueMinor - a.valueMinor),
    [monthTotals, categoryById, theme.textMuted, t]
  );

  const recentTransactions = transactions.slice(0, 5);

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
    <Screen overlay={fabNode}>
      <View style={styles.headerRow}>
        <Text style={[styles.greeting, { color: theme.textMuted }]}>{t('home.overview')}</Text>
        <Pressable
          onPress={() => router.push('/settings')}
          style={[styles.syncBadge, { backgroundColor: syncAccount ? theme.surfaceAlt : theme.warning + '22' }]}
        >
          <Icon
            name={syncAccount ? 'cloud-check-outline' : 'alert-outline'}
            size={14}
            color={syncAccount ? theme.textMuted : theme.warning}
          />
          <Text style={{ fontSize: 12, color: syncAccount ? theme.textMuted : theme.warning, fontWeight: '600' }}>
            {syncAccount ? t('home.synced') : t('home.notBackedUp')}
          </Text>
        </Pressable>
      </View>

      <SummaryCard summary={summaries[summaryPeriod]} period={summaryPeriod} onPeriodChange={setSummaryPeriod} />

      <View style={styles.quickRow}>
        {(['expense', 'income'] as const).map((type) => {
          const color = type === 'expense' ? theme.expense : theme.income;
          return (
            <Pressable
              key={type}
              onPress={() => router.push({ pathname: '/transactions/new', params: { type } })}
              accessibilityRole="button"
              style={[styles.quickButton, { backgroundColor: color + '18', borderColor: color + '44' }]}
            >
              <Icon name="plus" size={18} color={color} />
              <Text style={{ color, fontWeight: '700' }}>{type === 'expense' ? t('form.expense') : t('form.income')}</Text>
            </Pressable>
          );
        })}
      </View>

      {dueCount > 0 && (
        <Pressable
          onPress={() => router.push('/recurring')}
          accessibilityRole="button"
          style={[styles.dueBanner, { backgroundColor: theme.primary + '18', borderColor: theme.primary + '55' }]}
        >
          <Icon name="bell-ring-outline" size={20} color={theme.primary} />
          <Text style={{ flex: 1, color: theme.text, fontWeight: '600' }}>{t('rec.dueBanner', { count: dueCount })}</Text>
          <Icon name="chevron-right" size={20} color={theme.textMuted} />
        </Pressable>
      )}

      {accounts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('home.accounts')}</Text>
            <Link href="/accounts" style={{ color: theme.primary, fontSize: 13, fontWeight: '600' }}>
              {t('home.seeAll')}
            </Link>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountsRow}>
            {accounts.map((account) => (
              <Pressable
                key={account.id}
                onPress={() => router.push('/accounts')}
                style={[styles.accountCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <View style={[styles.accountIcon, { backgroundColor: account.color + '22' }]}>
                  <Icon name={account.icon as IconName} size={18} color={account.color} />
                </View>
                <Text style={{ color: theme.textMuted, fontSize: 12 }} numberOfLines={1}>
                  {account.name}
                </Text>
                <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
                  {money(balances[account.id] ?? account.openingBalanceMinor)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.textMuted }]}>{t('home.spendingByCategory')}</Text>
        <CategoryDonutChart segments={donutSegments} />
        {donutSegments.length > 0 && (
          <View style={styles.legend}>
            {donutSegments.slice(0, 6).map((segment) => (
              <View key={segment.id} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
                <Text style={[styles.legendLabel, { color: theme.text }]} numberOfLines={1}>
                  {segment.label}
                </Text>
                <Text style={{ color: theme.textMuted, fontSize: 13 }}>{money(segment.valueMinor)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {budgetProgress.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('home.budgets')}</Text>
            <Link href="/budgets" style={{ color: theme.primary, fontSize: 13, fontWeight: '600' }}>
              {t('home.seeAll')}
            </Link>
          </View>
          {budgetProgress.slice(0, 2).map((progress) => (
            <BudgetProgressCard
              key={progress.budget.id}
              progress={progress}
              category={progress.budget.categoryId ? (categoryById.get(progress.budget.categoryId) ?? null) : null}
            />
          ))}
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('home.recentActivity')}</Text>
          <Link href="/transactions" style={{ color: theme.primary, fontSize: 13, fontWeight: '600' }}>
            {t('home.seeAll')}
          </Link>
        </View>
        {recentTransactions.length === 0 ? (
          <EmptyState
            icon="receipt-text-outline"
            title={t('home.noTransactions')}
            message={t('home.noTransactionsHint')}
          />
        ) : (
          <View style={{ gap: 8 }}>
            {recentTransactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                category={transaction.categoryId ? (categoryById.get(transaction.categoryId) ?? null) : null}
                account={transaction.accountId ? (accountById.get(transaction.accountId) ?? null) : null}
                onPress={() => router.push(`/transactions/${transaction.id}`)}
              />
            ))}
          </View>
        )}
      </View>

    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  card: { borderRadius: 16, borderWidth: 1, padding: spacing.lg, alignItems: 'center', gap: spacing.md },
  cardTitle: { alignSelf: 'flex-start', fontSize: 13, fontWeight: '600' },
  legend: { width: '100%', gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 13 },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  quickRow: { flexDirection: 'row', gap: 10 },
  quickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  dueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  accountsRow: { gap: 10 },
  accountCard: { width: 150, borderRadius: 14, borderWidth: 1, padding: 12, gap: 4 },
  accountIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
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
