import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { AmountInput } from '../../components/AmountInput';
import { CategoryPicker } from '../../components/CategoryPicker';
import { DateField } from '../../components/DateField';
import { useTheme, spacing } from '../../constants/theme';
import { useCategoriesStore, selectActiveCategories } from '../../store/categoriesStore';
import { useTransactionsStore } from '../../store/transactionsStore';
import { useSettingsStore } from '../../store/settingsStore';
import { parseAmountToMinor } from '../../utils/money';
import { todayIso } from '../../utils/date';
import type { EntryType } from '../../models/types';

export default function NewTransactionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const categories = useCategoriesStore(selectActiveCategories);
  const createTransaction = useTransactionsStore((state) => state.create);
  const currency = useSettingsStore((state) => state.currency);

  const [type, setType] = useState<EntryType>('expense');
  const [amountText, setAmountText] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [dateIso, setDateIso] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const categoriesForType = useMemo(() => categories.filter((category) => category.type === type), [categories, type]);

  const handleSave = async () => {
    const amountMinor = parseAmountToMinor(amountText);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      setError('Enter a valid amount greater than zero.');
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
        note: note.trim(),
        date: dateIso,
      });
      router.back();
    } catch {
      setError('Could not save the transaction. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={styles.typeSwitch}>
        {(['expense', 'income'] as const).map((option) => {
          const selected = option === type;
          return (
            <Pressable
              key={option}
              onPress={() => {
                setType(option);
                setCategoryId(null);
              }}
              style={[
                styles.typeButton,
                { backgroundColor: selected ? theme.primary : theme.surfaceAlt },
              ]}
            >
              <Text style={{ color: selected ? theme.primaryText : theme.text, fontWeight: '700' }}>
                {option === 'expense' ? 'Expense' : 'Income'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.amountWrap}>
        <AmountInput value={amountText} onChangeText={setAmountText} currency={currency} autoFocus />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={[styles.label, { color: theme.textMuted }]}>Category</Text>
        <CategoryPicker categories={categoriesForType} selectedId={categoryId} onSelect={setCategoryId} />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={[styles.label, { color: theme.textMuted }]}>Date</Text>
        <DateField valueIso={dateIso} onChange={setDateIso} />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={[styles.label, { color: theme.textMuted }]}>Note (optional)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Weekly groceries"
          placeholderTextColor={theme.textMuted}
          style={[styles.noteInput, { color: theme.text, backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
        />
      </View>

      {error && <Text style={{ color: theme.danger }}>{error}</Text>}

      <Button label="Save transaction" onPress={handleSave} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  typeSwitch: { flexDirection: 'row', gap: 8 },
  typeButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  amountWrap: { alignItems: 'center', paddingVertical: spacing.lg },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  noteInput: { borderRadius: 12, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15 },
});
