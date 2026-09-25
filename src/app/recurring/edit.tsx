import React, { useMemo, useState } from 'react';
import { Alert, Text } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { CategorySelect } from '../../components/CategorySelect';
import type { IconName } from '../../components/Icon';
import { ChipGroup } from '../../components/ChipGroup';
import { DateField } from '../../components/DateField';
import { OptionField } from '../../components/OptionField';
import { SegmentedControl } from '../../components/SegmentedControl';
import { TextField } from '../../components/TextField';
import { useTheme } from '../../constants/theme';
import { useTranslation } from '../../i18n/useTranslation';
import { useSettingsStore } from '../../store/settingsStore';
import { useAccountsStore } from '../../store/accountsStore';
import { useActiveCategories } from '../../store/categoriesStore';
import { useRecurringStore } from '../../store/recurringStore';
import { minorToInputString, parseAmountToMinor } from '../../utils/money';
import { todayIso } from '../../utils/date';
import type { EntryType, RecurringFrequency } from '../../models/types';

const FREQUENCIES: RecurringFrequency[] = ['daily', 'weekly', 'monthly', 'yearly'];

/** Creates a recurring transaction, or edits one when opened with an `id`. */
export default function EditRecurringScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const currency = useSettingsStore((state) => state.currency);
  const categories = useActiveCategories();
  const accounts = useAccountsStore((state) => state.accounts);
  const { rules, create, update, remove } = useRecurringStore();
  const existing = id ? rules.find((rule) => rule.id === id) : undefined;

  const [type, setType] = useState<EntryType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fill the form once, when the rule being edited becomes available.
  const [filledFor, setFilledFor] = useState<string | null>(null);
  if (existing && filledFor !== existing.id) {
    setFilledFor(existing.id);
    setType(existing.type);
    setAmount(minorToInputString(existing.amountMinor));
    setCategoryId(existing.categoryId);
    setAccountId(existing.accountId);
    setNote(existing.note);
    setFrequency(existing.frequency);
    setStartDate(existing.startDate);
    setEndDate(existing.endDate);
  }

  const categoriesForType = useMemo(() => categories.filter((category) => category.type === type), [categories, type]);

  const handleSave = async () => {
    const amountMinor = parseAmountToMinor(amount);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) return setError(t('rec.amountError'));
    setError(null);
    setSaving(true);
    try {
      const values = {
        type,
        amountMinor,
        categoryId,
        accountId,
        note: note.trim(),
        frequency,
        startDate,
        endDate,
      };
      if (existing) await update(db, existing.id, values);
      else await create(db, values);
      router.back();
    } catch {
      setError(t('common.tryAgain'));
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePause = async () => {
    if (!existing) return;
    await update(db, existing.id, { isActive: !existing.isActive });
    router.back();
  };

  const handleDelete = () => {
    if (!existing) return;
    Alert.alert(t('rec.deleteTitle'), t('rec.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await remove(db, existing.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: existing ? t('rec.edit') : t('rec.new') }} />
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
      <TextField
        label={t('tx.amount')}
        prefix={currency}
        value={amount}
        onChangeText={(text) => setAmount(text.replace(/[^0-9.,]/g, ''))}
        keyboardType="decimal-pad"
        placeholder="0.00"
      />
      <CategorySelect
        categories={categoriesForType}
        selectedId={categoryId}
        onSelect={setCategoryId}
        type={type}
      />
      {accounts.length > 0 && (
        <OptionField
          label={t('form.account')}
          title={t('acc.selectAccount')}
          placeholder={t('form.noAccount')}
          noneLabel={t('form.noAccount')}
          value={accountId}
          onChange={setAccountId}
          options={accounts.map((account) => ({
            id: account.id,
            label: account.name,
            icon: account.icon as IconName,
            color: account.color,
          }))}
        />
      )}
      <TextField label={t('form.note')} value={note} onChangeText={setNote} placeholder={t('form.notePlaceholder')} />

      <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase' }}>
        {t('rec.frequency')}
      </Text>
      <ChipGroup
        options={FREQUENCIES.map((option) => ({ value: option, label: t(`rec.${option}` as const) }))}
        value={frequency}
        onChange={setFrequency}
      />

      <DateField label={t('rec.starts')} valueIso={startDate} onChange={setStartDate} />
      <DateField
        label={t('rec.ends')}
        valueIso={endDate ?? startDate}
        hasValue={endDate !== null}
        emptyLabel={t('rec.noEnd')}
        onChange={setEndDate}
        onClear={() => setEndDate(null)}
      />

      {error && <Text style={{ color: theme.danger }}>{error}</Text>}

      <Button label={t('rec.save')} onPress={handleSave} loading={saving} />
      {existing && (
        <>
          <Button
            label={existing.isActive ? t('common.pause') : t('common.resume')}
            variant="secondary"
            onPress={handleTogglePause}
          />
          <Button label={t('common.delete')} onPress={handleDelete} variant="danger" />
        </>
      )}
    </Screen>
  );
}
