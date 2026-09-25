import React, { useState } from 'react';
import { Alert, Text } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { DateField } from '../../components/DateField';
import { TextField } from '../../components/TextField';
import { useTheme } from '../../constants/theme';
import { useTranslation } from '../../i18n/useTranslation';
import { useSettingsStore } from '../../store/settingsStore';
import { useGoalsStore } from '../../store/goalsStore';
import { minorToInputString, parseAmountToMinor } from '../../utils/money';
import { todayIso } from '../../utils/date';

const GOAL_COLORS = ['#F59E0B', '#3B82F6', '#EC4899', '#10B981', '#A855F7', '#EF4444', '#14B8A6'];

/** Creates a savings goal, or edits one when opened with an `id`. */
export default function EditGoalScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const currency = useSettingsStore((state) => state.currency);
  const { goals, create, update, remove } = useGoalsStore();
  const existing = id ? goals.find((entry) => entry.goal.id === id)?.goal : undefined;

  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fill the form once, when the goal being edited becomes available.
  const [filledFor, setFilledFor] = useState<string | null>(null);
  if (existing && filledFor !== existing.id) {
    setFilledFor(existing.id);
    setName(existing.name);
    setTarget(minorToInputString(existing.targetMinor));
    setDeadline(existing.deadline);
  }

  const handleSave = async () => {
    if (!name.trim()) return setError(t('goal.nameError'));
    const targetMinor = parseAmountToMinor(target);
    if (!Number.isFinite(targetMinor) || targetMinor <= 0) return setError(t('goal.targetError'));
    setError(null);
    setSaving(true);
    try {
      if (existing) {
        await update(db, existing.id, { name: name.trim(), targetMinor, deadline });
      } else {
        await create(db, {
          name: name.trim(),
          icon: 'piggy-bank-outline',
          color: GOAL_COLORS[goals.length % GOAL_COLORS.length],
          targetMinor,
          deadline,
        });
      }
      router.back();
    } catch {
      setError(t('common.tryAgain'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!existing) return;
    Alert.alert(t('goal.deleteTitle'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await remove(db, existing.id);
          router.dismissTo('/goals');
        },
      },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: existing ? t('goal.edit') : t('goal.new') }} />
      <TextField label={t('goal.name')} value={name} onChangeText={setName} placeholder={t('goal.namePlaceholder')} />
      <TextField
        label={t('goal.target')}
        prefix={currency}
        value={target}
        onChangeText={(text) => setTarget(text.replace(/[^0-9.,]/g, ''))}
        keyboardType="decimal-pad"
        placeholder="0.00"
      />
      <DateField
        label={t('goal.deadline')}
        valueIso={deadline ?? todayIso()}
        hasValue={deadline !== null}
        emptyLabel={t('goal.noDeadline')}
        onChange={setDeadline}
        onClear={() => setDeadline(null)}
      />

      {error && <Text style={{ color: theme.danger }}>{error}</Text>}

      <Button label={t('common.save')} onPress={handleSave} loading={saving} />
      {existing && <Button label={t('common.delete')} onPress={handleDelete} variant="danger" />}
    </Screen>
  );
}
