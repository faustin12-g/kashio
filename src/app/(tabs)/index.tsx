import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../components/Screen';
import { CategoryDonutChart } from '../../components/CategoryDonutChart';
import { SummaryCard, type SummaryPeriod } from '../../components/SummaryCard';
import { BudgetProgressCard } from '../../components/BudgetProgressCard';
import { TransactionRow } from '../../components/TransactionRow';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { useTheme, spacing } from '../../constants/theme';
import { useMoney } from '../../hooks/useMoney';
import { categoryDisplayName } from '../../i18n';
import { useTranslation } from '../../i18n/useTranslation';
import { useTransactionsStore } from '../../store/transactionsStore';
import { useCategoriesStore } from '../../store/categoriesStore';
import { useBudgetsStore } from '../../store/budgetsStore';
import { useDebtsStore } from '../../store/debtsStore';
import { useRecurringStore } from '../../store/recurringStore';
import { useSyncStore } from '../../store/syncStore';
import { buildSummary, getSummary, type Summary } from '../../services/summary';
import { debtRemaining } from '../../services/goalsAndDebts';
import { calendarPeriodRange, todayIso } from '../../utils/date';
import { sumByCategory } from '../../repositories/transactionsRepository';
import { fonts } from '../../constants/fonts';

/** `calendarPeriodRange` names its bounds start/end; the summary and filter helpers expect from/to. */
function rangeFor({ start, end }: { start: string; end: string }): { from: string; to: string } {
  return { from: start, to: end };
}

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
  const debts = useDebtsStore((state) => state.debts);
  const loadDebts = useDebtsStore((state) => state.load);
  const syncAccount = useSyncStore((state) => state.account);
  const dueCount = useRecurringStore((state) => state.dueItems.length);
  const loadRecurring = useRecurringStore((state) => state.load);

  const [periodTotals, setPeriodTotals] = React.useState<{ categoryId: string | null; totalMinor: number }[]>([]);
  const [summaryPeriod, setSummaryPeriod] = React.useState<SummaryPeriod>('all');
  const [summaries, setSummaries] = React.useState<Record<SummaryPeriod, Summary>>({
    all: buildSummary(0, 0),
    today: buildSummary(0, 0),
    week: buildSummary(0, 0),
    month: buildSummary(0, 0),
    year: buildSummary(0, 0),
  });

  // "Recent activity" always shows this calendar month, independent of the period switcher above.
  const { start, end } = useMemo(() => calendarPeriodRange('month', todayIso()), []);
  // The summary card and the donut chart below it follow whichever period is selected.
  // `calendarPeriodRange` calls the same idea "day"; the UI calls it "today".
  const selectedRange: { start?: string; end?: string } = useMemo(
    () =>
      summaryPeriod === 'all'
        ? {}
        : calendarPeriodRange(summaryPeriod === 'today' ? 'day' : summaryPeriod, todayIso()),
    [summaryPeriod]
  );

  const refresh = useCallback(async () => {
    await Promise.all([
      loadTransactions(db, { from: start, to: end }),
      loadBudgets(db),
      loadDebts(db),
      loadRecurring(db),
      sumByCategory(db, { from: selectedRange.start, to: selectedRange.end, type: 'expense' }).then(setPeriodTotals),
      Promise.all([
        getSummary(db, {}),
        getSummary(db, rangeFor(calendarPeriodRange('day', todayIso()))),
        getSummary(db, rangeFor(calendarPeriodRange('week', todayIso()))),
        getSummary(db, rangeFor(calendarPeriodRange('month', todayIso()))),
        getSummary(db, rangeFor(calendarPeriodRange('year', todayIso()))),
      ]).then(([all, today, week, month, year]) => setSummaries({ all, today, week, month, year })),
    ]);
  }, [db, start, end, selectedRange, loadTransactions, loadBudgets, loadDebts, loadRecurring]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  const donutSegments = useMemo(
    () =>
      periodTotals
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
    [periodTotals, categoryById, theme.textMuted, t]
  );

  const periodLabel = {
    all: t('home.allTime'),
    today: t('common.today'),
    week: t('home.thisWeek'),
    month: t('home.thisMonth'),
    year: t('home.thisYear'),
  }[summaryPeriod];

  const recentTransactions = transactions.slice(0, 5);

  const debtTotals = useMemo(() => {
    let owedToMe = 0;
    let iOwe = 0;
    for (const { debt, paidMinor } of debts) {
      const remaining = debtRemaining(debt.amountMinor, paidMinor);
      if (remaining <= 0) continue;
      if (debt.direction === 'owed_to_me') owedToMe += remaining;
      else iOwe += remaining;
    }
    return { owedToMe, iOwe };
  }, [debts]);
  const hasDebts = debtTotals.owedToMe > 0 || debtTotals.iOwe > 0;

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
          <Text style={{ fontSize: 12, color: syncAccount ? theme.textMuted : theme.warning, fontFamily: fonts.semibold }}>
            {syncAccount ? t('home.synced') : t('home.notBackedUp')}
          </Text>
        </Pressable>
      </View>

      <SummaryCard
        summary={summaries[summaryPeriod]}
        period={summaryPeriod}
        onPeriodChange={setSummaryPeriod}
        onPressIncome={() =>
          router.push({
            pathname: '/transactions',
            params: { type: 'income', ...(summaryPeriod !== 'all' ? { datePreset: summaryPeriod } : {}) },
          })
        }
        onPressSpent={() =>
          router.push({
            pathname: '/transactions',
            params: { type: 'expense', ...(summaryPeriod !== 'all' ? { datePreset: summaryPeriod } : {}) },
          })
        }
      />

      {dueCount > 0 && (
        <Pressable
          onPress={() => router.push('/recurring')}
          accessibilityRole="button"
          style={[styles.dueBanner, { backgroundColor: theme.primary + '18', borderColor: theme.primary + '55' }]}
        >
          <Icon name="bell-ring-outline" size={20} color={theme.primary} />
          <Text style={{ flex: 1, color: theme.text, fontFamily: fonts.semibold }}>{t('rec.dueBanner', { count: dueCount })}</Text>
          <Icon name="chevron-right" size={20} color={theme.textMuted} />
        </Pressable>
      )}

      {hasDebts && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('home.debts')}</Text>
            <Link href="/debts" style={{ color: theme.primary, fontSize: 13, fontFamily: fonts.semibold }}>
              {t('home.seeAll')}
            </Link>
          </View>
          <View style={styles.debtRow}>
            <Pressable onPress={() => router.push('/debts')} style={[styles.debtCard, { backgroundColor: theme.surfaceAlt }]}>
              <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: fonts.semibold }}>{t('debt.totalOwedToMe')}</Text>
              <Text style={{ color: theme.income, fontSize: 18, fontFamily: fonts.bold }} numberOfLines={1}>
                {money(debtTotals.owedToMe)}
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push('/debts')} style={[styles.debtCard, { backgroundColor: theme.surfaceAlt }]}>
              <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: fonts.semibold }}>{t('debt.totalIOwe')}</Text>
              <Text style={{ color: theme.expense, fontSize: 18, fontFamily: fonts.bold }} numberOfLines={1}>
                {money(debtTotals.iOwe)}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.textMuted }]}>
          {t('home.spendingByCategory')} · {periodLabel}
        </Text>
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
            <Link href="/budgets" style={{ color: theme.primary, fontSize: 13, fontFamily: fonts.semibold }}>
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
          <Link href="/transactions" style={{ color: theme.primary, fontSize: 13, fontFamily: fonts.semibold }}>
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
  greeting: { fontSize: 13, fontFamily: fonts.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  card: { borderRadius: 16, borderWidth: 1, padding: spacing.lg, alignItems: 'center', gap: spacing.md },
  cardTitle: { alignSelf: 'flex-start', fontSize: 13, fontFamily: fonts.semibold },
  legend: { width: '100%', gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 13 },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontFamily: fonts.bold },
  dueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  debtRow: { flexDirection: 'row', gap: 10 },
  debtCard: { flex: 1, borderRadius: 14, padding: 12, gap: 4 },
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
