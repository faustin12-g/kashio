import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { AmountInput } from '../../components/AmountInput';
import { CategorySelect } from '../../components/CategorySelect';
import { DateField } from '../../components/DateField';
import { ReceiptField } from '../../components/ReceiptField';
import { SegmentedControl } from '../../components/SegmentedControl';
import { TextField } from '../../components/TextField';
import { useTheme, spacing } from '../../constants/theme';
import { useTranslation } from '../../i18n/useTranslation';
import { useActiveCategories } from '../../store/categoriesStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useTransactionsStore } from '../../store/transactionsStore';
import { useUndoStore } from '../../store/undoStore';
import { getTransaction } from '../../repositories/transactionsRepository';
import { deleteReceiptCopy, saveReceiptCopy } from '../../services/receipts';
import { minorToInputString, parseAmountToMinor } from '../../utils/money';
import type { EntryType, Transaction } from '../../models/types';
import { fonts } from '../../constants/fonts';

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const categories = useActiveCategories();
  const currency = useSettingsStore((state) => state.currency);
  const updateTransaction = useTransactionsStore((state) => state.update);
  const removeTransaction = useTransactionsStore((state) => state.remove);

  const [original, setOriginal] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<EntryType>('expense');
  const [amountText, setAmountText] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [dateIso, setDateIso] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
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
      setNote(transaction.note);
      setDateIso(transaction.date);
      setReceiptUri(transaction.receiptUri);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [db, id]);

  const categoriesForType = useMemo(() => categories.filter((category) => category.type === type), [categories, type]);

  const handleSave = async () => {
    if (!original) return;
    const amountMinor = parseAmountToMinor(amountText);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      setError(t('form.amountError'));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      // A picked photo not yet saved is a fresh local (cache) URI, different from
      // what was loaded; a saved one already lives under the app's own storage.
      let nextReceiptUri = original.receiptUri;
      if (receiptUri !== original.receiptUri) {
        if (original.receiptUri) deleteReceiptCopy(original.receiptUri);
        nextReceiptUri = receiptUri ? await saveReceiptCopy(receiptUri) : null;
      }
      await updateTransaction(db, id, {
        amountMinor,
        type,
        categoryId,
        note: note.trim(),
        date: dateIso,
        receiptUri: nextReceiptUri,
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
          // The receipt file itself is left alone: deleting it now would make
          // "Undo" bring back a transaction pointing at a photo that no longer exists.
          await removeTransaction(db, id);
          router.back();
          useUndoStore.getState().show(t('undo.transactionDeleted'), () => {
            void useTransactionsStore.getState().restore(db, id);
          });
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

      <DateField label={t('form.date')} valueIso={dateIso} onChange={setDateIso} />

      <TextField label={t('form.note')} value={note} onChangeText={setNote} placeholder={t('form.notePlaceholder')} />

      <ReceiptField uri={receiptUri} onChange={setReceiptUri} />

      {error && <Text style={{ color: theme.danger }}>{error}</Text>}

      <Button label={t('form.saveChanges')} onPress={handleSave} loading={saving} />
      <Button label={t('form.delete')} onPress={handleDelete} variant="danger" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  amountWrap: { alignItems: 'center', paddingVertical: spacing.lg },
  label: { fontSize: 13, fontFamily: fonts.semibold, textTransform: 'uppercase', letterSpacing: 0.4 },
});
