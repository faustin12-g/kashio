import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../constants/theme';

interface ProgressRingProps {
  /** 0 to 100. */
  percent: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  /** Shown in the middle. Defaults to the percentage. */
  label?: string;
}

/** A circular progress indicator, used for savings goals. */
export function ProgressRing({ percent, size = 64, strokeWidth = 7, color, label }: ProgressRingProps) {
  const theme = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const center = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={center} cy={center} r={radius} stroke={theme.surfaceAlt} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * circumference} ${circumference}`}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <Text style={[styles.label, { color: theme.text, fontSize: size * 0.22 }]}>{label ?? `${clamped}%`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { position: 'absolute', fontWeight: '800' },
});
