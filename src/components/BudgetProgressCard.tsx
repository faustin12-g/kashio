import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../constants/theme';
import { formatMoney } from '../utils/money';
import type { BudgetProgress, Category } from '../models/types';

interface BudgetProgressCardProps {
  progress: BudgetProgress;
  category: Category | null;
}

export function BudgetProgressCard({ progress, category }: BudgetProgressCardProps) {
  const theme = useTheme();
  const { budget, spentMinor, percentUsed } = progress;
  const clampedPercent = Math.min(percentUsed, 100);
  const isOverBudget = percentUsed > 100;
  const barColor = isOverBudget ? theme.danger : percentUsed > 80 ? theme.warning : theme.income;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          {category ? `${category.icon} ${category.name}` : 'Overall budget'}
        </Text>
        <Text style={[styles.period, { color: theme.textMuted }]}>
          {budget.period === 'weekly' ? 'This week' : 'This month'}
        </Text>
      </View>

      <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
        <View style={[styles.fill, { width: `${clampedPercent}%`, backgroundColor: barColor }]} />
      </View>

      <View style={styles.footer}>
        <Text style={{ color: theme.textMuted, fontSize: 13 }}>
          {formatMoney(spentMinor, budget.currency)} of {formatMoney(budget.amountLimitMinor, budget.currency)}
        </Text>
        <Text style={{ color: isOverBudget ? theme.danger : theme.textMuted, fontSize: 13, fontWeight: '600' }}>
          {isOverBudget ? 'Over budget' : `${Math.round(percentUsed)}%`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '600' },
  period: { fontSize: 12 },
  track: { height: 8, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
});
