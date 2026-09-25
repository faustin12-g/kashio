import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { fonts } from '../constants/fonts';
import { useTheme } from '../constants/theme';
import { Icon } from './Icon';

/** Every illustration is drawn in this square. */
export const ILLUSTRATION_SIZE = 260;

/** A value that runs 0 → 1 over and over, optionally after a delay. */
function useLoop(durationMs: number, delayMs = 0, native = true): Animated.Value {
  const value = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delayMs),
        Animated.timing(value, {
          toValue: 1,
          duration: durationMs,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: native,
        }),
        Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: native }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [value, durationMs, delayMs, native]);
  return value;
}

/** A value that eases 0 → 1 → 0 forever, for gentle floating. */
function useFloat(durationMs: number, delayMs = 0): Animated.Value {
  const value = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delayMs),
        Animated.timing(value, {
          toValue: 1,
          duration: durationMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: durationMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [value, durationMs, delayMs]);
  return value;
}

function Blob({ color }: { color: string }) {
  return (
    <Svg width={ILLUSTRATION_SIZE} height={ILLUSTRATION_SIZE} style={StyleSheet.absoluteFill}>
      <Circle cx={130} cy={130} r={118} fill={color + '16'} />
      <Circle cx={130} cy={130} r={84} fill={color + '14'} />
    </Svg>
  );
}

function Coin({ color }: { color: string }) {
  return (
    <Svg width={38} height={38} viewBox="0 0 38 38">
      <Circle cx={19} cy={19} r={18} fill="#F59E0B" />
      <Circle cx={19} cy={19} r={13} fill="none" stroke="#FCD34D" strokeWidth={2.5} />
      <Circle cx={19} cy={19} r={5} fill={color} opacity={0.9} />
    </Svg>
  );
}

/** Coins dropping into a wallet: "log every spend". */
export function CoinsIllustration() {
  const theme = useTheme();
  const float = useFloat(1400);
  const loops = [useLoop(2000, 0), useLoop(2000, 650), useLoop(2000, 1300)];
  const xs = [78, 112, 146];

  return (
    <View style={styles.box}>
      <Blob color={theme.primary} />
      {loops.map((loop, index) => (
        <Animated.View
          key={index}
          style={{
            position: 'absolute',
            left: xs[index],
            top: 20,
            opacity: loop.interpolate({ inputRange: [0, 0.12, 0.78, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateY: loop.interpolate({ inputRange: [0, 1], outputRange: [0, 112] }) },
              { rotate: loop.interpolate({ inputRange: [0, 1], outputRange: ['-20deg', '25deg'] }) },
            ],
          }}
        >
          <Coin color={theme.primary} />
        </Animated.View>
      ))}
      <Animated.View
        style={{
          position: 'absolute',
          left: 42,
          top: 118,
          transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }],
        }}
      >
        <Svg width={176} height={120} viewBox="0 0 176 120">
          <Rect x={4} y={22} width={168} height={92} rx={22} fill={theme.primary} />
          <Path d="M4 44 Q4 22 26 22 L150 22 Q172 22 172 44 L172 52 L4 52 Z" fill="#000" opacity={0.14} />
          <Rect x={110} y={58} width={62} height={34} rx={17} fill="#FFFFFF" opacity={0.95} />
          <Circle cx={128} cy={75} r={6} fill={theme.primary} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const THRESHOLDS = [50, 70, 80, 90, 100];

/** A budget ring filling up and changing colour, with the bell ringing near the limit. */
export function BudgetIllustration() {
  const theme = useTheme();
  const progress = useLoop(4200, 500, false);
  const wiggle = useFloat(160);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const id = progress.addListener(({ value }) => setPercent(Math.round(Math.min(1, value / 0.85) * 100)));
    return () => progress.removeListener(id);
  }, [progress]);

  const size = 176;
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = percent < 70 ? theme.income : percent < 90 ? theme.warning : theme.expense;
  const near = percent >= 80;

  return (
    <View style={styles.box}>
      <Blob color={theme.primary} />
      <View style={[styles.center, { width: size, height: size }]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.surface} strokeWidth={stroke} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - percent / 100)}
          />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text style={{ fontFamily: fonts.extrabold, fontSize: 40, color: theme.text }}>{percent}%</Text>
        </View>
      </View>
      <View style={styles.thresholdRow}>
        {THRESHOLDS.map((mark) => (
          <View
            key={mark}
            style={[styles.dot, { backgroundColor: percent >= mark ? color : theme.border }]}
          />
        ))}
      </View>
      <Animated.View
        style={{
          position: 'absolute',
          right: 30,
          top: 26,
          opacity: near ? 1 : 0,
          transform: [{ rotate: wiggle.interpolate({ inputRange: [0, 1], outputRange: ['-16deg', '16deg'] }) }],
        }}
      >
        <View style={[styles.bell, { backgroundColor: theme.expense }]}>
          <Icon name="bell-ring-outline" size={26} color="#FFFFFF" />
        </View>
      </Animated.View>
    </View>
  );
}

/** Bars growing one after another, with a "spending is down" tag: "see the big picture". */
export function ChartIllustration() {
  const theme = useTheme();
  const grow = useLoop(2600, 200, false);
  const pop = useFloat(900);
  const targets = [0.45, 0.62, 0.5, 0.82, 0.68, 0.95];
  const maxHeight = 130;

  return (
    <View style={styles.box}>
      <Blob color={theme.primary} />
      <View style={[styles.bars, { height: maxHeight }]}>
        {targets.map((target, index) => {
          const start = index * 0.09;
          const height = grow.interpolate({
            inputRange: [0, start, Math.min(1, start + 0.4), 1],
            outputRange: [6, 6, maxHeight * target, maxHeight * target],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={index}
              style={{
                width: 22,
                height,
                borderRadius: 8,
                backgroundColor: index === targets.length - 1 ? theme.warning : theme.primary,
                opacity: index === targets.length - 1 ? 1 : 0.55 + index * 0.08,
              }}
            />
          );
        })}
      </View>
      <Animated.View
        style={{
          position: 'absolute',
          left: 30,
          top: 34,
          transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
        }}
      >
        <View style={[styles.tag, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Icon name="trending-down" size={18} color={theme.income} />
          <Text style={{ fontFamily: fonts.bold, color: theme.income, fontSize: 15 }}>−12%</Text>
        </View>
      </Animated.View>
    </View>
  );
}

/** A shield that pulses, with a fingerprint and a cloud: "yours, and safe". */
export function SafeIllustration() {
  const theme = useTheme();
  const pulse = useLoop(2000);
  const float = useFloat(1500);
  const cloudFloat = useFloat(1700, 300);

  return (
    <View style={styles.box}>
      <Blob color={theme.primary} />
      <Animated.View
        style={{
          position: 'absolute',
          width: 132,
          height: 132,
          borderRadius: 66,
          backgroundColor: theme.primary,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }],
        }}
      />
      <Animated.View
        style={{ transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }] }}
      >
        <Svg width={132} height={150} viewBox="0 0 132 150">
          <Path
            d="M66 4 L122 26 V70 C122 106 98 132 66 146 C34 132 10 106 10 70 V26 Z"
            fill={theme.primary}
          />
          <Path d="M66 4 L122 26 V70 C122 106 98 132 66 146 Z" fill="#000" opacity={0.12} />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Icon name="fingerprint" size={58} color="#FFFFFF" />
        </View>
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          right: 22,
          top: 34,
          transform: [{ translateY: cloudFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }],
        }}
      >
        <View style={[styles.cloud, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Icon name="cloud-upload-outline" size={30} color={theme.primary} />
        </View>
      </Animated.View>
      <View style={[styles.cloud, styles.lock, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Icon name="wifi-off" size={24} color={theme.textMuted} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: ILLUSTRATION_SIZE, height: ILLUSTRATION_SIZE, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  thresholdRow: { position: 'absolute', bottom: 26, flexDirection: 'row', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  bell: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 30 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  cloud: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lock: { position: 'absolute', left: 22, bottom: 40, width: 50, height: 50, borderRadius: 25 },
});
