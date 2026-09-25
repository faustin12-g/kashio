import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../constants/theme';
import { Icon, type IconName } from './Icon';

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  message?: string;
}

export function EmptyState({ icon = 'note-text-outline', title, message }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <Icon name={icon} size={40} color={theme.textMuted} />
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {message ? <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 32, gap: 6 },
  title: { fontSize: 15, fontWeight: '600' },
  message: { fontSize: 13, textAlign: 'center', maxWidth: 260 },
});
