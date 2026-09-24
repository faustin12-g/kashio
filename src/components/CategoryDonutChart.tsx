import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '../constants/theme';
import { formatMoney } from '../utils/money';

export interface DonutSegment {
  id: string;
  label: string;
  color: string;
  valueMinor: number;
}

interface CategoryDonutChartProps {
  segments: DonutSegment[];
  currency: string;
  size?: number;
  strokeWidth?: number;
}

/**
 * A donut chart built from stacked SVG circles (dasharray/dashoffset per
 * segment) rather than hand-computed arc paths — same visual result, far
 * less trigonometry to get wrong.
 */
export function CategoryDonutChart({ segments, currency, size = 180, strokeWidth = 22 }: CategoryDonutChartProps) {
  const theme = useTheme();
  const total = segments.reduce((sum, segment) => sum + segment.valueMinor, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  if (total <= 0) {
    return (
      <View style={[styles.emptyWrap, { width: size, height: size }]}>
        <Text style={{ color: theme.textMuted, textAlign: 'center' }}>No spending yet this period</Text>
      </View>
    );
  }

  // Precompute each segment's cumulative starting offset via reduce, threading
  // the running total through the accumulator itself (a new object each
  // step) instead of mutating a `let` across iterations — keeps render a
  // pure function of props.
  interface Arc {
    segment: DonutSegment;
    fraction: number;
    dashOffset: number;
  }
  const { list: arcs } = segments.reduce<{ list: Arc[]; cumulative: number }>(
    (acc, segment) => {
      const fraction = segment.valueMinor / total;
      const dashOffset = -acc.cumulative * circumference;
      return { list: [...acc.list, { segment, fraction, dashOffset }], cumulative: acc.cumulative + fraction };
    },
    { list: [], cumulative: 0 }
  );

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation={-90} origin={`${center}, ${center}`}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={theme.surfaceAlt}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {arcs.map(({ segment, fraction, dashOffset }) => (
            <Circle
              key={segment.id}
              cx={center}
              cy={center}
              r={radius}
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${fraction * circumference} ${circumference}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
              fill="none"
            />
          ))}
        </G>
      </Svg>
      <View style={styles.centerLabel} pointerEvents="none">
        <Text style={[styles.centerValue, { color: theme.text }]}>{formatMoney(total, currency)}</Text>
        <Text style={[styles.centerCaption, { color: theme.textMuted }]}>total</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  centerLabel: { position: 'absolute', alignItems: 'center' },
  centerValue: { fontSize: 16, fontWeight: '700' },
  centerCaption: { fontSize: 11 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center' },
});
