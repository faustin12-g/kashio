import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '../constants/theme';
import { shortMonthLabel } from '../i18n';
import { useTranslation } from '../i18n/useTranslation';
import type { MonthlyTotal } from '../repositories/transactionsRepository';

interface BarChartProps {
  data: MonthlyTotal[];
  height?: number;
}

/** Income and spending side by side for each month. Drawn directly with SVG, no chart library. */
export function BarChart({ data, height = 150 }: BarChartProps) {
  const theme = useTheme();
  const { language } = useTranslation();
  const max = Math.max(1, ...data.flatMap((entry) => [entry.incomeMinor, entry.expenseMinor]));
  const barWidth = 14;
  const gap = 4;
  const groupWidth = barWidth * 2 + gap;

  return (
    <View>
      <View style={[styles.plot, { height }]}>
        {data.map((entry) => {
          const incomeHeight = Math.round((entry.incomeMinor / max) * (height - 4));
          const spentHeight = Math.round((entry.expenseMinor / max) * (height - 4));
          return (
            <View key={entry.month} style={styles.column}>
              <Svg width={groupWidth} height={height}>
                <Rect
                  x={0}
                  y={height - Math.max(incomeHeight, entry.incomeMinor > 0 ? 3 : 0)}
                  width={barWidth}
                  height={Math.max(incomeHeight, entry.incomeMinor > 0 ? 3 : 0)}
                  rx={4}
                  fill={theme.income}
                />
                <Rect
                  x={barWidth + gap}
                  y={height - Math.max(spentHeight, entry.expenseMinor > 0 ? 3 : 0)}
                  width={barWidth}
                  height={Math.max(spentHeight, entry.expenseMinor > 0 ? 3 : 0)}
                  rx={4}
                  fill={theme.expense}
                />
              </Svg>
            </View>
          );
        })}
      </View>
      <View style={[styles.axis, { borderTopColor: theme.border }]}>
        {data.map((entry) => (
          <Text key={entry.month} style={[styles.axisLabel, { color: theme.textMuted }]}>
            {shortMonthLabel(entry.month, language)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  column: { alignItems: 'center' },
  axis: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 6 },
  axisLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center', minWidth: 32 },
});
