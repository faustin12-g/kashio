import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { AmountInput } from '../../components/AmountInput';
import { CategorySelect } from '../../components/CategorySelect';
import { DateField } from '../../components/DateField';
import type { IconName } from '../../components/Icon';
import { OptionField } from '../../components/OptionField';
import { SegmentedControl } from '../../components/SegmentedControl';
import { TextField } from '../../components/TextField';
import { useTheme, spacing } from '../../constants/theme';
import { useTranslation } from '../../i18n/useTranslation';
import { useAccountsStore } from '../../store/accountsStore';
import { useActiveCategories } from '../../store/categoriesStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useTransactionsStore } from '../../store/transactionsStore';
import { getTransaction } from '../../repositories/transactionsRepository';
import { minorToInputString, parseAmountToMinor } from '../../utils/money';
import type { EntryType, Transaction } from '../../models/types';

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const categories = useActiveCategories();
  const accounts = useAccountsStore((state) => state.accounts);
  const currency = useSettingsStore((state) => state.currency);
  const updateTransaction = useTransactionsStore((state) => state.update);
  const removeTransaction = useTransactionsStore((state) => state.remove);

  const [original, setOriginal] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<EntryType>('expense');
  const [amountText, setAmountText] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [dateIso, setDateIso] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getTransaction(db, id).then((transaction) => {
      if (cancelled || !transaction) return;
      setOriginal(transaction);
      setType(transaction.type);
      setAmountText(minorToInputString(transaction.amountMinor));
      setCategoryId(transaction.categoryId);
      setAccountId(transaction.accountId);
      setNote(transaction.note);
      setDateIso(transaction.date);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [db, id]);

  const categoriesForType = useMemo(() => categories.filter((category) => category.type === type), [categories, type]);
  const validAccountId = accounts.some((account) => account.id === accountId) ? accountId : null;

  const handleSave = async () => {
    const amountMinor = parseAmountToMinor(amountText);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      setError(t('form.amountError'));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await updateTransaction(db, id, {
        amountMinor,
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

  const handleDelete = () => {
    Alert.alert(t('form.deleteTitle'), t('form.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await removeTransaction(db, id);
          router.back();
        },
      },
    ]);
  };

  if (loading || !original) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('form.editTransaction') }} />
        <Text style={{ color: theme.textMuted }}>{t('common.loading')}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t('form.editTransaction') }} />

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
        <AmountInput value={amountText} onChangeText={setAmountText} currency={currency} />
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

      <TextField label={t('form.note')} value={note} onChangeText={setNote} placeholder={t('form.notePlaceholder')} />

      {error && <Text style={{ color: theme.danger }}>{error}</Text>}

      <Button label={t('form.saveChanges')} onPress={handleSave} loading={saving} />
      <Button label={t('form.delete')} onPress={handleDelete} variant="danger" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  amountWrap: { alignItems: 'center', paddingVertical: spacing.lg },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
});
