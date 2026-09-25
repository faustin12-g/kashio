import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { AmountInput } from '../../components/AmountInput';
import { CategorySelect } from '../../components/CategorySelect';
import { useTheme, spacing } from '../../constants/theme';
import { useTranslation } from '../../i18n/useTranslation';
import { useActiveCategories } from '../../store/categoriesStore';
import { useBudgetsStore } from '../../store/budgetsStore';
import { useSettingsStore } from '../../store/settingsStore';
import { parseAmountToMinor } from '../../utils/money';
import { todayIso } from '../../utils/date';
import type { BudgetPeriod } from '../../models/types';

export default function NewBudgetScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const activeCategories = useActiveCategories();
  const categories = useMemo(
    () => activeCategories.filter((category) => category.type === 'expense'),
    [activeCategories]
  );
  const createBudget = useBudgetsStore((state) => state.create);
  const currency = useSettingsStore((state) => state.currency);

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amountText, setAmountText] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const amountLimitMinor = parseAmountToMinor(amountText);
    if (!Number.isFinite(amountLimitMinor) || amountLimitMinor <= 0) {
      setError(t('bud.limitError'));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createBudget(db, {
        categoryId,
        amountLimitMinor,
        currency,
        period,
        startDate: todayIso(),
      });
      router.back();
    } catch {
      setError(t('bud.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('bud.new') }} />
      <View style={{ gap: spacing.sm }}>
        <Text style={[styles.label, { color: theme.textMuted }]}>{t('bud.appliesTo')}</Text>
        <CategorySelect
          categories={categories}
          selectedId={categoryId}
          onSelect={setCategoryId}
          type="expense"
          noneLabel={t('bud.overall')}
        />
      </View>

      <View style={styles.amountWrap}>
        <AmountInput value={amountText} onChangeText={setAmountText} currency={currency} autoFocus />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={[styles.label, { color: theme.textMuted }]}>{t('bud.resets')}</Text>
        <View style={styles.typeSwitch}>
          {(['weekly', 'monthly'] as const).map((option) => {
            const selected = option === period;
            return (
              <Pressable
                key={option}
                onPress={() => setPeriod(option)}
                style={[styles.typeButton, { backgroundColor: selected ? theme.primary : theme.surfaceAlt }]}
              >
                <Text style={{ color: selected ? theme.primaryText : theme.text, fontWeight: '700' }}>
                  {option === 'weekly' ? t('bud.weekly') : t('bud.monthly')}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {error && <Text style={{ color: theme.danger }}>{error}</Text>}

      <Button label={t('bud.save')} onPress={handleSave} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  amountWrap: { alignItems: 'center', paddingVertical: spacing.lg },
  typeSwitch: { flexDirection: 'row', gap: 8 },
  typeButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
});
