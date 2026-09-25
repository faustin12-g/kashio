import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../constants/theme';
import { resolveCategoryIcon } from '../constants/categoryIcons';
import { categoryDisplayName } from '../i18n';
import { useTranslation } from '../i18n/useTranslation';
import { useMoney } from '../hooks/useMoney';
import { computePace } from '../services/pace';
import { describePace } from '../services/paceText';
import { todayIso } from '../utils/date';
import type { BudgetProgress, Category } from '../models/types';
import { Icon } from './Icon';

interface BudgetProgressCardProps {
  progress: BudgetProgress;
  category: Category | null;
  /** Show the "at this pace..." forecast line. */
  showPace?: boolean;
}

export function BudgetProgressCard({ progress, category, showPace = true }: BudgetProgressCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const money = useMoney();
  const { budget, spentMinor, percentUsed } = progress;
  const clampedPercent = Math.min(percentUsed, 100);
  const isOverBudget = percentUsed > 100;
  const barColor = isOverBudget ? theme.danger : percentUsed > 80 ? theme.warning : theme.income;

  const paceInfo = showPace
    ? describePace(
        computePace({
          spentMinor,
          limitMinor: budget.amountLimitMinor,
          periodStart: progress.periodStart,
          periodEnd: progress.periodEnd,
          todayIso: todayIso(),
        }),
        t,
        money
      )
    : null;
  const paceColor =
    paceInfo?.tone === 'good'
      ? theme.income
      : paceInfo?.tone === 'warning'
        ? theme.warning
        : paceInfo?.tone === 'danger'
          ? theme.danger
          : theme.textMuted;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Icon
            name={category ? resolveCategoryIcon(category.icon) : 'wallet-outline'}
            size={18}
            color={category?.color ?? theme.textMuted}
          />
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {category ? categoryDisplayName(category.name, t) : t('bud.overallBudget')}
          </Text>
        </View>
        <Text style={[styles.period, { color: theme.textMuted }]}>
          {budget.period === 'weekly' ? t('bud.thisWeek') : t('bud.thisMonth')}
        </Text>
      </View>

      <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
        <View style={[styles.fill, { width: `${clampedPercent}%`, backgroundColor: barColor }]} />
      </View>

      <View style={styles.footer}>
        <Text style={{ color: theme.textMuted, fontSize: 13, flexShrink: 1 }}>
          {t('bud.ofLimit', { spent: money(spentMinor), limit: money(budget.amountLimitMinor) })}
        </Text>
        <Text style={{ color: isOverBudget ? theme.danger : theme.textMuted, fontSize: 13, fontWeight: '600' }}>
          {isOverBudget ? t('bud.overBudget') : `${Math.round(percentUsed)}%`}
        </Text>
      </View>

      {paceInfo ? <Text style={[styles.pace, { color: paceColor }]}>{paceInfo.text}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  title: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  period: { fontSize: 12 },
  track: { height: 8, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  pace: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
});
