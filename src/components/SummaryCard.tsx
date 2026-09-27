import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../constants/theme';
import { fonts } from '../constants/fonts';
import { useMoney } from '../hooks/useMoney';
import { useTranslation } from '../i18n/useTranslation';
import type { Summary } from '../services/summary';
import { Icon } from './Icon';

export type SummaryPeriod = 'all' | 'today' | 'week' | 'month' | 'year';

interface SummaryCardProps {
  summary: Summary;
  period: SummaryPeriod;
  onPeriodChange: (period: SummaryPeriod) => void;
  /** Tapping the Income or Spent tile opens Transactions filtered to that type. */
  onPressIncome: () => void;
  onPressSpent: () => void;
}

/** Balance, total income and total spending at a glance, for whichever period is selected. */
export function SummaryCard({ summary, period, onPeriodChange, onPressIncome, onPressSpent }: SummaryCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const money = useMoney();
  const PERIODS: { value: SummaryPeriod; label: string }[] = [
    { value: 'all', label: t('home.allTime') },
    { value: 'today', label: t('common.today') },
    { value: 'week', label: t('home.thisWeek') },
    { value: 'month', label: t('home.thisMonth') },
    { value: 'year', label: t('home.thisYear') },
  ];
  const negative = summary.balanceMinor < 0;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.label, { color: theme.textMuted }]}>{t('home.balance')}</Text>
      <Text style={[styles.balance, { color: negative ? theme.danger : theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {money(summary.balanceMinor)}
      </Text>

      <View style={[styles.toggle, { backgroundColor: theme.surfaceAlt }]}>
        {PERIODS.map((option) => {
          const selected = option.value === period;
          return (
            <Pressable
              key={option.value}
              onPress={() => onPeriodChange(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.toggleItem, selected && { backgroundColor: theme.primary }]}
            >
              <Text
                style={[styles.toggleText, { color: selected ? theme.primaryText : theme.textMuted }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.tiles}>
        <Pressable
          onPress={onPressIncome}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.tile,
            { backgroundColor: theme.surfaceAlt, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <View style={styles.tileHeader}>
            <View style={[styles.tileIcon, { backgroundColor: theme.income + '22' }]}>
              <Icon name="tray-arrow-down" size={15} color={theme.income} />
            </View>
            <Text style={[styles.tileLabel, { color: theme.textMuted }]}>{t('home.income')}</Text>
          </View>
          <Text style={[styles.tileValue, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
            {money(summary.incomeMinor)}
          </Text>
        </Pressable>
        <Pressable
          onPress={onPressSpent}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.tile,
            { backgroundColor: theme.surfaceAlt, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <View style={styles.tileHeader}>
            <View style={[styles.tileIcon, { backgroundColor: theme.expense + '22' }]}>
              <Icon name="tray-arrow-up" size={15} color={theme.expense} />
            </View>
            <Text style={[styles.tileLabel, { color: theme.textMuted }]}>{t('home.spent')}</Text>
          </View>
          <Text style={[styles.tileValue, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
            {money(summary.expenseMinor)}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  label: { fontSize: 13, fontFamily: fonts.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  balance: { fontSize: 34, fontFamily: fonts.extrabold, marginTop: -6 },
  toggle: { flexDirection: 'row', borderRadius: 999, padding: 3, gap: 2 },
  toggleItem: { flex: 1, paddingVertical: 7, paddingHorizontal: 4, borderRadius: 999, alignItems: 'center' },
  toggleText: { fontSize: 12, fontFamily: fonts.bold },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, borderRadius: 14, padding: 12, gap: 8 },
  tileHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tileIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontSize: 12, fontFamily: fonts.semibold },
  tileValue: { fontSize: 17, fontFamily: fonts.bold },
});
