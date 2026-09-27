import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../constants/theme';
import { resolveCategoryIcon } from '../constants/categoryIcons';
import { categoryDisplayName } from '../i18n';
import { useTranslation } from '../i18n/useTranslation';
import { useMoney } from '../hooks/useMoney';
import type { BudgetProgress, Category } from '../models/types';
import { Icon } from './Icon';
import { fonts } from '../constants/fonts';

interface BudgetProgressCardProps {
  progress: BudgetProgress;
  category: Category | null;
}

export function BudgetProgressCard({ progress, category }: BudgetProgressCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const money = useMoney();
  const { budget, spentMinor, percentUsed } = progress;
  const clampedPercent = Math.min(percentUsed, 100);
  const isOverBudget = percentUsed > 100;
  const barColor = isOverBudget ? theme.danger : percentUsed > 80 ? theme.warning : theme.income;

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
          {budget.period === 'weekly' ? t('bud.thisWeek') : budget.period === 'once' ? t('bud.once') : t('bud.thisMonth')}
        </Text>
      </View>

      <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
        <View style={[styles.fill, { width: `${clampedPercent}%`, backgroundColor: barColor }]} />
      </View>

      <View style={styles.footer}>
        <Text style={{ color: theme.textMuted, fontSize: 13, flexShrink: 1 }}>
          {t('bud.ofLimit', { spent: money(spentMinor), limit: money(budget.amountLimitMinor) })}
        </Text>
        <Text style={{ color: isOverBudget ? theme.danger : theme.textMuted, fontSize: 13, fontFamily: fonts.semibold }}>
          {isOverBudget ? t('bud.overBudget') : `${Math.round(percentUsed)}%`}
        </Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  title: { fontSize: 15, fontFamily: fonts.semibold, flexShrink: 1 },
  period: { fontSize: 12 },
  track: { height: 8, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
});
