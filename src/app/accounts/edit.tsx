import React, { useState } from 'react';
import { Alert, Text } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { ChipGroup } from '../../components/ChipGroup';
import { TextField } from '../../components/TextField';
import { ACCOUNT_TYPES, ACCOUNT_TYPE_STYLE } from '../../constants/accountTypes';
import { useTheme } from '../../constants/theme';
import { useTranslation } from '../../i18n/useTranslation';
import { useSettingsStore } from '../../store/settingsStore';
import { useAccountsStore } from '../../store/accountsStore';
import { minorToInputString, parseSignedAmountToMinor } from '../../utils/money';
import type { AccountType } from '../../models/types';

/** Adds an account, or edits one when opened with an `id`. */
export default function EditAccountScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const currency = useSettingsStore((state) => state.currency);
  const { accounts, create, update, remove } = useAccountsStore();
  const existing = id ? accounts.find((account) => account.id === id) : undefined;

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('cash');
  const [opening, setOpening] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fill the form once, when the account being edited becomes available.
  const [filledFor, setFilledFor] = useState<string | null>(null);
  if (existing && filledFor !== existing.id) {
    setFilledFor(existing.id);
    setName(existing.name);
    setType(existing.type);
    setOpening(minorToInputString(existing.openingBalanceMinor));
  }

  const handleSave = async () => {
    if (!name.trim()) return setError(t('acc.nameError'));
    const openingBalanceMinor = opening.trim() === '' ? 0 : parseSignedAmountToMinor(opening);
    if (Number.isNaN(openingBalanceMinor)) return setError(t('acc.balanceError'));
    setError(null);
    setSaving(true);
    try {
      const style = ACCOUNT_TYPE_STYLE[type];
      const values = { name: name.trim(), type, icon: style.icon, color: style.color, openingBalanceMinor };
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
    Alert.alert(t('acc.deleteTitle'), t('acc.deleteMessage'), [
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
      <Stack.Screen options={{ title: existing ? t('acc.edit') : t('acc.new') }} />
      <TextField label={t('acc.name')} value={name} onChangeText={setName} placeholder={t('acc.namePlaceholder')} />
      <ChipGroup
        options={ACCOUNT_TYPES.map((option) => ({
          value: option,
          label: t(`acc.type.${option}` as const),
          icon: ACCOUNT_TYPE_STYLE[option].icon,
        }))}
        value={type}
        onChange={setType}
      />
      <TextField
        label={t('acc.opening')}
        prefix={currency}
        value={opening}
        onChangeText={(text) => setOpening(text.replace(/[^0-9.,-]/g, ''))}
        keyboardType="numbers-and-punctuation"
        placeholder="0"
      />
      <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: -8 }}>{t('acc.openingHint')}</Text>

      {error && <Text style={{ color: theme.danger }}>{error}</Text>}

      <Button label={t('common.save')} onPress={handleSave} loading={saving} />
      {existing && <Button label={t('common.delete')} onPress={handleDelete} variant="danger" />}
    </Screen>
  );
}
