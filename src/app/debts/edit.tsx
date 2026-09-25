import React, { useState } from 'react';
import { Alert, Text } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { DateField } from '../../components/DateField';
import { SegmentedControl } from '../../components/SegmentedControl';
import { TextField } from '../../components/TextField';
import { useTheme } from '../../constants/theme';
import { useTranslation } from '../../i18n/useTranslation';
import { useSettingsStore } from '../../store/settingsStore';
import { useDebtsStore } from '../../store/debtsStore';
import { minorToInputString, parseAmountToMinor } from '../../utils/money';
import { todayIso } from '../../utils/date';
import type { DebtDirection } from '../../models/types';

/** Records a debt, or edits one when opened with an `id`. */
export default function EditDebtScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const currency = useSettingsStore((state) => state.currency);
  const { debts, create, update, remove } = useDebtsStore();
  const existing = id ? debts.find((entry) => entry.debt.id === id)?.debt : undefined;

  const [direction, setDirection] = useState<DebtDirection>('owed_to_me');
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fill the form once, when the debt being edited becomes available.
  const [filledFor, setFilledFor] = useState<string | null>(null);
  if (existing && filledFor !== existing.id) {
    setFilledFor(existing.id);
    setDirection(existing.direction);
    setPerson(existing.person);
    setAmount(minorToInputString(existing.amountMinor));
    setDate(existing.date);
    setDueDate(existing.dueDate);
    setNote(existing.note);
  }

  const handleSave = async () => {
    if (!person.trim()) return setError(t('debt.personError'));
    const amountMinor = parseAmountToMinor(amount);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) return setError(t('debt.amountError'));
    setError(null);
    setSaving(true);
    try {
      const values = { direction, person: person.trim(), amountMinor, date, dueDate, note: note.trim() };
      if (existing) await update(db, existing.id, values);
      else await create(db, values);
      router.back();
    } catch {
      setError(t('common.tryAgain'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!existing) return;
    Alert.alert(t('debt.deleteTitle'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await remove(db, existing.id);
          router.dismissTo('/debts');
        },
      },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('debt.new') }} />
      <SegmentedControl
        value={direction}
        onChange={setDirection}
        options={[
          { value: 'owed_to_me', label: t('debt.owedToMe'), icon: 'arrow-down-circle-outline' },
          { value: 'i_owe', label: t('debt.iOwe'), icon: 'arrow-up-circle-outline' },
        ]}
      />
      <TextField
        label={t('debt.person')}
        value={person}
        onChangeText={setPerson}
        placeholder={t('debt.personPlaceholder')}
      />
      <TextField
        label={t('debt.amount')}
        prefix={currency}
        value={amount}
        amount
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
      />
      <DateField label={t('debt.date')} valueIso={date} onChange={setDate} />
      <DateField
        label={t('debt.dueDate')}
        valueIso={dueDate ?? todayIso()}
        hasValue={dueDate !== null}
        emptyLabel={t('debt.noDueDate')}
        onChange={setDueDate}
        onClear={() => setDueDate(null)}
      />
      <TextField label={t('debt.note')} value={note} onChangeText={setNote} />

      {error && <Text style={{ color: theme.danger }}>{error}</Text>}

      <Button label={t('common.save')} onPress={handleSave} loading={saving} />
      {existing && <Button label={t('common.delete')} onPress={handleDelete} variant="danger" />}
    </Screen>
  );
}
