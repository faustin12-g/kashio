import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../constants/theme';
import { formatDisplayDate } from '../utils/date';
import { formatSignedMoney } from '../utils/money';
import type { Category, Transaction } from '../models/types';

interface TransactionRowProps {
  transaction: Transaction;
  category: Category | null;
  onPress: () => void;
}

export function TransactionRow({ transaction, category, onPress }: TransactionRowProps) {
  const theme = useTheme();
  const amountColor = transaction.type === 'expense' ? theme.expense : theme.income;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: (category?.color ?? theme.textMuted) + '22' }]}>
        <Text style={styles.icon}>{category?.icon ?? '❔'}</Text>
      </View>
      <View style={styles.middle}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {category?.name ?? 'Uncategorized'}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={1}>
          {transaction.note || formatDisplayDate(transaction.date)}
        </Text>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>
        {formatSignedMoney(transaction.amountMinor, transaction.currency, transaction.type)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 18 },
  middle: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '600' },
  subtitle: { fontSize: 13 },
  amount: { fontSize: 15, fontWeight: '700' },
});
