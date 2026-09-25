import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../constants/theme';
import { useMoney } from '../hooks/useMoney';
import { useTranslation } from '../i18n/useTranslation';
import type { Summary } from '../services/summary';
import { Icon } from './Icon';

export type SummaryPeriod = 'all' | 'month';

interface SummaryCardProps {
  summary: Summary;
  period: SummaryPeriod;
  onPeriodChange: (period: SummaryPeriod) => void;
}

/** Balance, total income and total spending at a glance, for all time or just this month. */
export function SummaryCard({ summary, period, onPeriodChange }: SummaryCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const money = useMoney();
  const PERIODS: { value: SummaryPeriod; label: string }[] = [
    { value: 'all', label: t('home.allTime') },
    { value: 'month', label: t('home.thisMonth') },
  ];
  const negative = summary.balanceMinor < 0;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.topRow}>
        <Text style={[styles.label, { color: theme.textMuted }]}>{t('home.balance')}</Text>
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
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text style={[styles.balance, { color: negative ? theme.danger : theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {money(summary.balanceMinor)}
      </Text>

      <View style={styles.tiles}>
        <View style={[styles.tile, { backgroundColor: theme.income + '1A' }]}>
          <View style={styles.tileHeader}>
            <Icon name="arrow-down-circle-outline" size={18} color={theme.income} />
            <Text style={[styles.tileLabel, { color: theme.textMuted }]}>{t('home.income')}</Text>
          </View>
          <Text style={[styles.tileValue, { color: theme.income }]} numberOfLines={1} adjustsFontSizeToFit>
            {money(summary.incomeMinor)}
          </Text>
        </View>
        <View style={[styles.tile, { backgroundColor: theme.expense + '1A' }]}>
          <View style={styles.tileHeader}>
            <Icon name="arrow-up-circle-outline" size={18} color={theme.expense} />
            <Text style={[styles.tileLabel, { color: theme.textMuted }]}>{t('home.spent')}</Text>
          </View>
          <Text style={[styles.tileValue, { color: theme.expense }]} numberOfLines={1} adjustsFontSizeToFit>
            {money(summary.expenseMinor)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  toggle: { flexDirection: 'row', borderRadius: 999, padding: 3 },
  toggleItem: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  toggleText: { fontSize: 12, fontWeight: '700' },
  balance: { fontSize: 34, fontWeight: '800' },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, borderRadius: 12, padding: 12, gap: 6 },
  tileHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tileLabel: { fontSize: 12, fontWeight: '600' },
  tileValue: { fontSize: 17, fontWeight: '700' },
});
