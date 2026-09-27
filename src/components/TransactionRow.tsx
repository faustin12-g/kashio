import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../constants/theme';
import { resolveCategoryIcon } from '../constants/categoryIcons';
import { categoryDisplayName, formatDateForLanguage } from '../i18n';
import { useTranslation } from '../i18n/useTranslation';
import { useSettingsStore } from '../store/settingsStore';
import { formatSignedMoney } from '../utils/money';
import type { Category, Transaction } from '../models/types';
import { Icon } from './Icon';
import { fonts } from '../constants/fonts';

interface TransactionRowProps {
  transaction: Transaction;
  category: Category | null;
  onPress: () => void;
}

export function TransactionRow({ transaction, category, onPress }: TransactionRowProps) {
  const theme = useTheme();
  const { t, language } = useTranslation();
  const currency = useSettingsStore((state) => state.currency);
  const amountColor = transaction.type === 'expense' ? theme.expense : theme.income;

  const subtitle = transaction.note || formatDateForLanguage(transaction.date, language);
  const iconColor = transaction.isOpeningBalance ? theme.primary : (category?.color ?? theme.textMuted);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconColor + '22' }]}>
        <Icon
          name={
            transaction.isOpeningBalance
              ? 'wallet-plus-outline'
              : category
                ? resolveCategoryIcon(category.icon)
                : 'help-circle-outline'
          }
          size={20}
          color={iconColor}
        />
      </View>
      <View style={styles.middle}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {transaction.isOpeningBalance
              ? t('tx.openingBalance')
              : category
                ? categoryDisplayName(category.name, t)
                : t('tx.uncategorized')}
          </Text>
          {transaction.recurringId ? (
            <Icon name="autorenew" size={14} color={theme.textMuted} />
          ) : null}
          {transaction.receiptUri ? (
            <Icon name="paperclip" size={14} color={theme.textMuted} />
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
  title: { fontSize: 15, fontFamily: fonts.semibold, flexShrink: 1 },
  subtitle: { fontSize: 13 },
  amount: { fontSize: 15, fontFamily: fonts.bold },
});
