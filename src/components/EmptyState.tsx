import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../constants/theme';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
}

export function EmptyState({ icon = '🗒️', title, message }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {message ? <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 32, gap: 6 },
  icon: { fontSize: 32 },
  title: { fontSize: 15, fontWeight: '600' },
  message: { fontSize: 13, textAlign: 'center', maxWidth: 260 },
});
