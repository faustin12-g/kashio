import React, { useMemo, useState } from 'react';
import { Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { DateField } from '../../components/DateField';
import type { IconName } from '../../components/Icon';
import { OptionField, type FieldOption } from '../../components/OptionField';
import { TextField } from '../../components/TextField';
import { useTheme } from '../../constants/theme';
import { useMoney } from '../../hooks/useMoney';
import { useTranslation } from '../../i18n/useTranslation';
import { useSettingsStore } from '../../store/settingsStore';
import { useAccountsStore } from '../../store/accountsStore';
import { parseAmountToMinor } from '../../utils/money';
import { todayIso } from '../../utils/date';

/** Moves money from one of your accounts to another. Not income and not spending. */
export default function TransferScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const money = useMoney();
  const currency = useSettingsStore((state) => state.currency);
  const { accounts, balances, createTransfer } = useAccountsStore();

  const [fromId, setFromId] = useState<string | null>(accounts[0]?.id ?? null);
  const [toId, setToId] = useState<string | null>(accounts[1]?.id ?? null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const options: FieldOption[] = useMemo(
    () =>
      accounts.map((account) => ({
        id: account.id,
        label: account.name,
        subtitle: money(balances[account.id] ?? account.openingBalanceMinor),
        icon: account.icon as IconName,
        color: account.color,
      })),
    [accounts, balances, money]
  );

  const handleSave = async () => {
    if (!fromId || !toId || fromId === toId) return setError(t('acc.sameAccount'));
    const amountMinor = parseAmountToMinor(amount);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) return setError(t('acc.transferError'));
    setError(null);
    setSaving(true);
    try {
      await createTransfer(db, { fromAccountId: fromId, toAccountId: toId, amountMinor, note: note.trim(), date });
      router.back();
    } catch {
      setError(t('common.tryAgain'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('acc.transferTitle') }} />
      <OptionField
        label={t('acc.from')}
        title={t('acc.selectAccount')}
        options={options}
        value={fromId}
        onChange={setFromId}
        placeholder={t('acc.selectAccount')}
      />
      <OptionField
        label={t('acc.to')}
        title={t('acc.selectAccount')}
        options={options}
        value={toId}
        onChange={setToId}
        placeholder={t('acc.selectAccount')}
      />
      <TextField
        label={t('acc.amount')}
        prefix={currency}
        value={amount}
        amount
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
      />
      <DateField label={t('form.date')} valueIso={date} onChange={setDate} />
      <TextField label={t('form.note')} value={note} onChangeText={setNote} />

      {error && <Text style={{ color: theme.danger }}>{error}</Text>}
      <Button label={t('acc.transferSave')} onPress={handleSave} loading={saving} />
    </Screen>
  );
}
