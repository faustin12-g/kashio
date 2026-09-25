import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../components/Screen';
import { BarChart } from '../../components/BarChart';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { useTheme, spacing } from '../../constants/theme';
import { resolveCategoryIcon } from '../../constants/categoryIcons';
import { useMoney } from '../../hooks/useMoney';
import { categoryDisplayName, type TFunction } from '../../i18n';
import { useTranslation } from '../../i18n/useTranslation';
import { useBudgetsStore } from '../../store/budgetsStore';
import { useCategoriesStore } from '../../store/categoriesStore';
import { loadInsights, type Change, type Insights } from '../../services/insights';
import { computePace } from '../../services/pace';
import { describePace } from '../../services/paceText';
import { todayIso } from '../../utils/date';

function changeText(change: Change, up: string, down: string, same: string, none: string, t: TFunction): string {
  if (change.percent === null) return none;
  if (change.deltaMinor === 0) return same;
  return t(change.deltaMinor > 0 ? (up as never) : (down as never), { percent: Math.abs(change.percent) });
}

export default function InsightsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const money = useMoney();
  const db = useSQLiteContext();
  const budgets = useBudgetsStore((state) => state.progress);
  const loadBudgets = useBudgetsStore((state) => state.load);
  const categories = useCategoriesStore((state) => state.categories);
  const [insights, setInsights] = useState<Insights | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadBudgets(db);
      loadInsights(db, todayIso()).then(setInsights);
    }, [db, loadBudgets])
  );

  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const nameOf = (categoryId: string | null) => {
    const category = categoryId ? categoryById.get(categoryId) : undefined;
    return category ? categoryDisplayName(category.name, t) : t('tx.uncategorized');
  };

  const paceRows = budgets
    .map((progress) => {
      const pace = describePace(
        computePace({
          spentMinor: progress.spentMinor,
          limitMinor: progress.budget.amountLimitMinor,
          periodStart: progress.periodStart,
          periodEnd: progress.periodEnd,
          todayIso: todayIso(),
        }),
        t,
        money
      );
      return pace ? { progress, pace } : null;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const hasAnyData =
    insights !== null && (insights.series.some((entry) => entry.incomeMinor > 0 || entry.expenseMinor > 0) || paceRows.length > 0);

  if (insights !== null && !hasAnyData) {
    return (
      <Screen>
        <EmptyState icon="chart-line" title={t('ins.nothingYet')} />
      </Screen>
    );
  }

  const toneColor = (tone: string) =>
    tone === 'good' ? theme.income : tone === 'warning' ? theme.warning : tone === 'danger' ? theme.danger : theme.textMuted;

  const spending = insights?.spendingChange;
  const income = insights?.incomeChange;
  const topTotal = insights ? Math.max(1, ...insights.topCategories.map((entry) => entry.totalMinor)) : 1;

  return (
    <Screen>
      {insights && (
        <>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{t('ins.incomeVsSpending')}</Text>
            <Text style={[styles.caption, { color: theme.textMuted }]}>{t('ins.trend')}</Text>
            <BarChart data={insights.series} />
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: theme.income }]} />
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>{t('ins.legendIncome')}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: theme.expense }]} />
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>{t('ins.legendSpent')}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{t('ins.vsLastMonth')}</Text>
            {spending && (
              <View style={styles.changeRow}>
                <Icon
                  name={spending.deltaMinor > 0 ? 'trending-up' : spending.deltaMinor < 0 ? 'trending-down' : 'minus'}
                  size={22}
                  color={spending.deltaMinor > 0 ? theme.expense : spending.deltaMinor < 0 ? theme.income : theme.textMuted}
                />
                <Text style={[styles.changeText, { color: theme.text }]}>
                  {changeText(spending, 'ins.spendingUp', 'ins.spendingDown', t('ins.spendingSame'), t('ins.spendingNoBase'), t)}
                </Text>
              </View>
            )}
            {income && income.percent !== null && income.deltaMinor !== 0 && (
              <View style={styles.changeRow}>
                <Icon
                  name={income.deltaMinor > 0 ? 'trending-up' : 'trending-down'}
                  size={22}
                  color={income.deltaMinor > 0 ? theme.income : theme.expense}
                />
                <Text style={[styles.changeText, { color: theme.text }]}>
                  {t(income.deltaMinor > 0 ? 'ins.incomeUp' : 'ins.incomeDown', { percent: Math.abs(income.percent) })}
                </Text>
              </View>
            )}

            {insights.categoryChanges.length > 0 && (
              <View style={styles.subsection}>
                <Text style={[styles.caption, { color: theme.textMuted }]}>{t('ins.biggestChanges')}</Text>
                {insights.categoryChanges.map((change) => {
                  const category = change.categoryId ? categoryById.get(change.categoryId) : undefined;
                  const more = change.deltaMinor > 0;
                  return (
                    <View key={change.categoryId ?? 'none'} style={styles.changeRow}>
                      <Icon
                        name={category ? resolveCategoryIcon(category.icon) : 'help-circle-outline'}
                        size={20}
                        color={category?.color ?? theme.textMuted}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.text, fontWeight: '600' }}>{nameOf(change.categoryId)}</Text>
                        <Text style={{ color: more ? theme.expense : theme.income, fontSize: 12 }}>
                          {t(more ? 'ins.moreThanLast' : 'ins.lessThanLast', { amount: money(Math.abs(change.deltaMinor)) })}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {insights.topCategories.length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{t('ins.topCategories')}</Text>
              {insights.topCategories.map((entry) => {
                const category = entry.categoryId ? categoryById.get(entry.categoryId) : undefined;
                const color = category?.color ?? theme.textMuted;
                return (
                  <View key={entry.categoryId ?? 'none'} style={styles.topRow}>
                    <View style={styles.topHeader}>
                      <Text style={{ color: theme.text, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                        {nameOf(entry.categoryId)}
                      </Text>
                      <Text style={{ color: theme.textMuted, fontSize: 13 }}>{money(entry.totalMinor)}</Text>
                    </View>
                    <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
                      <View style={[styles.fill, { width: `${(entry.totalMinor / topTotal) * 100}%`, backgroundColor: color }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{t('ins.paceTitle')}</Text>
        {paceRows.length === 0 ? (
          <Text style={{ color: theme.textMuted, fontSize: 13 }}>{t('ins.paceNone')}</Text>
        ) : (
          paceRows.map(({ progress, pace }) => {
            const category = progress.budget.categoryId ? categoryById.get(progress.budget.categoryId) : undefined;
            return (
              <View key={progress.budget.id} style={styles.paceRow}>
                <View style={styles.changeRow}>
                  <Icon
                    name={category ? resolveCategoryIcon(category.icon) : 'wallet-outline'}
                    size={18}
                    color={category?.color ?? theme.textMuted}
                  />
                  <Text style={{ color: theme.text, fontWeight: '600' }}>
                    {category ? categoryDisplayName(category.name, t) : t('bud.overallBudget')}
                  </Text>
                </View>
                <Text style={{ color: toneColor(pace.tone), fontSize: 13, lineHeight: 18 }}>{pace.text}</Text>
              </View>
            );
          })
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  caption: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  legend: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  changeText: { flex: 1, fontSize: 14, fontWeight: '600' },
  subsection: { gap: 10 },
  topRow: { gap: 6 },
  topHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: { height: 8, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  paceRow: { gap: 4 },
});
