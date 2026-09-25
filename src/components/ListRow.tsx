import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../constants/theme';
import { Icon, type IconName } from './Icon';

interface ListRowProps {
  icon: IconName;
  color?: string;
  title: string;
  subtitle?: string;
  /** Text on the right, e.g. an amount. */
  trailing?: string;
  trailingColor?: string;
  /** Small second line under the trailing text. */
  trailingSubtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
}

/** A tappable row with a coloured icon, a title, and optional text on the right. */
export function ListRow({
  icon,
  color,
  title,
  subtitle,
  trailing,
  trailingColor,
  trailingSubtitle,
  onPress,
  showChevron,
}: ListRowProps) {
  const theme = useTheme();
  const tint = color ?? theme.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: tint + '22' }]}>
        <Icon name={icon} size={20} color={tint} />
      </View>
      <View style={styles.middle}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? (
        <View style={styles.trailing}>
          <Text style={[styles.trailingText, { color: trailingColor ?? theme.text }]} numberOfLines={1}>
            {trailing}
          </Text>
          {trailingSubtitle ? (
            <Text style={{ color: theme.textMuted, fontSize: 12 }} numberOfLines={1}>
              {trailingSubtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
      {showChevron ? <Icon name="chevron-right" size={22} color={theme.textMuted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  middle: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '600' },
  subtitle: { fontSize: 13 },
  trailing: { alignItems: 'flex-end', maxWidth: '45%' },
  trailingText: { fontSize: 15, fontWeight: '700' },
});
