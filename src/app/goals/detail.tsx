import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { ListRow } from '../../components/ListRow';
import { ProgressRing } from '../../components/ProgressRing';
import { TextField } from '../../components/TextField';
import { useTheme } from '../../constants/theme';
import { useMoney } from '../../hooks/useMoney';
import { formatDateForLanguage } from '../../i18n';
import { useTranslation } from '../../i18n/useTranslation';
import { useSettingsStore } from '../../store/settingsStore';
import { useGoalsStore } from '../../store/goalsStore';
import { listContributions } from '../../repositories/goalsRepository';
import { goalPercent, isGoalReached, monthlyAmountNeeded } from '../../services/goalsAndDebts';
import { parseAmountToMinor } from '../../utils/money';
import { todayIso } from '../../utils/date';
import type { GoalContribution } from '../../models/types';

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { t, language } = useTranslation();
  const money = useMoney();
  const currency = useSettingsStore((state) => state.currency);
  const { goals, load, addContribution, removeContribution } = useGoalsStore();
  const entry = goals.find((item) => item.goal.id === id);

  const [history, setHistory] = useState<GoalContribution[]>([]);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    await load(db);
    setHistory(await listContributions(db, id));
  }, [db, id, load]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  if (!entry) {
    return (
      <Screen>
        <Text style={{ color: theme.textMuted }}>{t('common.loading')}</Text>
      </Screen>
    );
  }

  const { goal, savedMinor } = entry;
  const percent = goalPercent(savedMinor, goal.targetMinor);
  const reached = isGoalReached(savedMinor, goal.targetMinor);
  const monthly = monthlyAmountNeeded(goal.targetMinor, savedMinor, goal.deadline, todayIso());

  const submit = async (direction: 1 | -1) => {
    const amountMinor = parseAmountToMinor(amount);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) return setError(t('goal.amountError'));
    if (direction === -1 && amountMinor > savedMinor) return setError(t('goal.notEnough'));
    setError(null);
    await addContribution(db, {
      goalId: goal.id,
      amountMinor: amountMinor * direction,
      date: todayIso(),
      note: '',
    });
    setAmount('');
    setHistory(await listContributions(db, goal.id));
  };

  const confirmRemove = (contributionId: string) => {
    Alert.alert(t('common.delete'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await removeContribution(db, contributionId);
          setHistory(await listContributions(db, goal.id));
        },
      },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: goal.name }} />

      <View style={styles.hero}>
        <ProgressRing percent={percent} size={140} strokeWidth={12} color={reached ? theme.income : goal.color} />
        <Text style={[styles.saved, { color: theme.text }]}>
          {t('goal.saved', { saved: money(savedMinor), target: money(goal.targetMinor) })}
        </Text>
        {reached ? (
          <Text style={{ color: theme.income, fontWeight: '700' }}>{t('goal.reached')}</Text>
        ) : monthly !== null ? (
          <Text style={{ color: theme.textMuted, textAlign: 'center' }}>
            {t('goal.monthlyNeeded', { amount: money(monthly) })}
          </Text>
        ) : null}
      </View>

      <TextField
        label={t('goal.amount')}
        prefix={currency}
        value={amount}
        amount
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
      />
      {error && <Text style={{ color: theme.danger }}>{error}</Text>}
      <View style={styles.buttons}>
        <View style={styles.half}>
          <Button label={t('goal.addMoney')} onPress={() => submit(1)} />
        </View>
        <View style={styles.half}>
          <Button label={t('goal.withdraw')} variant="secondary" onPress={() => submit(-1)} />
        </View>
      </View>

      {history.length > 0 && (
        <View style={{ gap: 10 }}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('goal.history')}</Text>
          {history.map((item) => (
            <ListRow
              key={item.id}
              icon={item.amountMinor >= 0 ? 'plus-circle-outline' : 'minus-circle-outline'}
              color={item.amountMinor >= 0 ? theme.income : theme.expense}
              title={item.amountMinor >= 0 ? t('goal.deposit') : t('goal.withdrawal')}
              subtitle={formatDateForLanguage(item.date, language)}
              trailing={`${item.amountMinor >= 0 ? '+' : '−'}${money(Math.abs(item.amountMinor))}`}
              trailingColor={item.amountMinor >= 0 ? theme.income : theme.expense}
              onPress={() => confirmRemove(item.id)}
            />
          ))}
        </View>
      )}

      <Button
        label={t('common.edit')}
        variant="secondary"
        onPress={() => router.push({ pathname: '/goals/edit', params: { id: goal.id } })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  saved: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
});
