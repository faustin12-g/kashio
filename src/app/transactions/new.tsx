import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { AmountInput } from '../../components/AmountInput';
import { CategorySelect } from '../../components/CategorySelect';
import { DateField } from '../../components/DateField';
import { Icon, type IconName } from '../../components/Icon';
import { OptionField } from '../../components/OptionField';
import { SegmentedControl } from '../../components/SegmentedControl';
import { TextField } from '../../components/TextField';
import { useTheme, spacing } from '../../constants/theme';
import { useMoney } from '../../hooks/useMoney';
import { categoryDisplayName } from '../../i18n';
import { useTranslation } from '../../i18n/useTranslation';
import { useAccountsStore } from '../../store/accountsStore';
import { useActiveCategories } from '../../store/categoriesStore';
import { useTransactionsStore } from '../../store/transactionsStore';
import { useSettingsStore } from '../../store/settingsStore';
import { recentDistinctEntries, type RecentEntry } from '../../repositories/transactionsRepository';
import { minorToInputString, parseAmountToMinor } from '../../utils/money';
import { todayIso } from '../../utils/date';
import type { EntryType } from '../../models/types';

export default function NewTransactionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const money = useMoney();
  const categories = useActiveCategories();
  const accounts = useAccountsStore((state) => state.accounts);
  const createTransaction = useTransactionsStore((state) => state.create);
  const currency = useSettingsStore((state) => state.currency);

  const [type, setType] = useState<EntryType>(params.type === 'income' ? 'income' : 'expense');
  const [amountText, setAmountText] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [dateIso, setDateIso] = useState(todayIso());
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    recentDistinctEntries(db, 6).then((entries) => {
      if (cancelled) return;
      setRecent(entries);
      // Start with the account used last, so a repeat entry is one tap less.
      const lastAccount = entries.find((entry) => entry.accountId)?.accountId ?? null;
      setAccountId((current) => current ?? lastAccount);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const categoriesForType = useMemo(() => categories.filter((category) => category.type === type), [categories, type]);
  const validAccountId = accounts.some((account) => account.id === accountId) ? accountId : null;

  const applyRecent = (entry: RecentEntry) => {
    setType(entry.type);
    setAmountText(minorToInputString(entry.amountMinor));
    setCategoryId(entry.categoryId);
    setAccountId(entry.accountId);
    setNote(entry.note);
  };

  const recentLabel = (entry: RecentEntry): string => {
    const category = categories.find((item) => item.id === entry.categoryId);
    const name = entry.note || (category ? categoryDisplayName(category.name, t) : t('tx.uncategorized'));
    return `${name} · ${money(entry.amountMinor)}`;
  };

  const handleSave = async () => {
    const amountMinor = parseAmountToMinor(amountText);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      setError(t('form.amountError'));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createTransaction(db, {
        amountMinor,
        currency,
        type,
        categoryId,
        accountId: validAccountId,
        note: note.trim(),
        date: dateIso,
      });
      router.back();
    } catch {
      setError(t('form.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('form.newTransaction') }} />

      {recent.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text style={[styles.label, { color: theme.textMuted }]}>{t('form.repeat')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRow}>
            {recent.map((entry, index) => {
              const category = categories.find((item) => item.id === entry.categoryId);
              return (
                <Pressable
                  key={index}
                  onPress={() => applyRecent(entry)}
                  style={[styles.recentChip, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                >
                  <Icon
                    name={(entry.type === 'income' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline') as IconName}
                    size={16}
                    color={category?.color ?? theme.textMuted}
                  />
                  <Text style={{ color: theme.text, fontSize: 13 }} numberOfLines={1}>
                    {recentLabel(entry)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <SegmentedControl
        value={type}
        onChange={(next) => {
          setType(next);
          setCategoryId(null);
        }}
        options={[
          { value: 'expense', label: t('form.expense'), icon: 'arrow-up-circle-outline' },
          { value: 'income', label: t('form.income'), icon: 'arrow-down-circle-outline' },
        ]}
      />

      <View style={styles.amountWrap}>
        <AmountInput value={amountText} onChangeText={setAmountText} currency={currency} autoFocus />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={[styles.label, { color: theme.textMuted }]}>{t('form.category')}</Text>
        <CategorySelect
          categories={categoriesForType}
          selectedId={categoryId}
          onSelect={setCategoryId}
          type={type}
        />
      </View>

      {accounts.length > 0 && (
        <OptionField
          label={t('form.account')}
          title={t('acc.selectAccount')}
          placeholder={t('form.noAccount')}
          noneLabel={t('form.noAccount')}
          value={validAccountId}
          onChange={setAccountId}
          options={accounts.map((account) => ({
            id: account.id,
            label: account.name,
            icon: account.icon as IconName,
            color: account.color,
          }))}
        />
      )}

      <DateField label={t('form.date')} valueIso={dateIso} onChange={setDateIso} />

      <TextField
        label={t('form.note')}
        value={note}
        onChangeText={setNote}
        placeholder={t('form.notePlaceholder')}
      />

      {error && <Text style={{ color: theme.danger }}>{error}</Text>}

      <Button label={t('form.save')} onPress={handleSave} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  amountWrap: { alignItems: 'center', paddingVertical: spacing.lg },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  recentRow: { gap: 8 },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxWidth: 240,
  },
});
