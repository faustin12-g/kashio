import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../constants/theme';
import { resolveCategoryIcon } from '../constants/categoryIcons';
import { categoryDisplayName, formatDateForLanguage } from '../i18n';
import { useTranslation } from '../i18n/useTranslation';
import { useSettingsStore } from '../store/settingsStore';
import { formatSignedMoney } from '../utils/money';
import type { Account, Category, Transaction } from '../models/types';
import { Icon } from './Icon';

interface TransactionRowProps {
  transaction: Transaction;
  category: Category | null;
  account?: Account | null;
  onPress: () => void;
}

export function TransactionRow({ transaction, category, account, onPress }: TransactionRowProps) {
  const theme = useTheme();
  const { t, language } = useTranslation();
  const currency = useSettingsStore((state) => state.currency);
  const amountColor = transaction.type === 'expense' ? theme.expense : theme.income;

  const detail = transaction.note || formatDateForLanguage(transaction.date, language);
  const subtitle = account ? `${account.name} · ${detail}` : detail;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: (category?.color ?? theme.textMuted) + '22' }]}>
        <Icon
          name={category ? resolveCategoryIcon(category.icon) : 'help-circle-outline'}
          size={20}
          color={category?.color ?? theme.textMuted}
        />
      </View>
      <View style={styles.middle}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {category ? categoryDisplayName(category.name, t) : t('tx.uncategorized')}
          </Text>
          {transaction.recurringId ? (
            <Icon name="autorenew" size={14} color={theme.textMuted} />
          ) : null}
        </View>
        <Text style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>
        {formatSignedMoney(transaction.amountMinor, currency, transaction.type)}
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
  middle: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  subtitle: { fontSize: 13 },
  amount: { fontSize: 15, fontWeight: '700' },
});
