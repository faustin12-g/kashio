import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { ListRow } from '../../components/ListRow';
import { TextField } from '../../components/TextField';
import { useTheme, spacing } from '../../constants/theme';
import { useMoney } from '../../hooks/useMoney';
import { formatDateForLanguage } from '../../i18n';
import { useTranslation } from '../../i18n/useTranslation';
import { useSettingsStore } from '../../store/settingsStore';
import { useDebtsStore } from '../../store/debtsStore';
import { listPayments } from '../../repositories/debtsRepository';
import { debtRemaining, debtStatus } from '../../services/goalsAndDebts';
import { parseAmountToMinor } from '../../utils/money';
import { todayIso } from '../../utils/date';
import type { DebtPayment } from '../../models/types';

export default function DebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { t, language } = useTranslation();
  const money = useMoney();
  const currency = useSettingsStore((state) => state.currency);
  const { debts, load, addPayment, removePayment } = useDebtsStore();
  const entry = debts.find((item) => item.debt.id === id);

  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    await load(db);
    setPayments(await listPayments(db, id));
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

  const { debt, paidMinor } = entry;
  const remaining = debtRemaining(debt.amountMinor, paidMinor);
  const status = debtStatus(debt.amountMinor, paidMinor, debt.dueDate, todayIso());
  const percent = debt.amountMinor > 0 ? Math.min(100, (paidMinor / debt.amountMinor) * 100) : 0;
  const statusColor = status === 'paid' ? theme.income : status === 'overdue' ? theme.danger : theme.primary;

  const submitPayment = async () => {
    const amountMinor = parseAmountToMinor(amount);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) return setError(t('debt.amountError'));
    if (amountMinor > remaining) return setError(t('debt.paymentTooBig'));
    setError(null);
    await addPayment(db, { debtId: debt.id, amountMinor, date: todayIso(), note: '' });
    setAmount('');
    setPayments(await listPayments(db, debt.id));
  };

  const confirmRemovePayment = (paymentId: string) => {
    Alert.alert(t('common.delete'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await removePayment(db, paymentId);
          setPayments(await listPayments(db, debt.id));
        },
      },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: debt.person }} />

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: '600' }}>
          {debt.direction === 'owed_to_me' ? t('debt.owedToMe') : t('debt.iOwe')}
        </Text>
        <Text style={[styles.amount, { color: theme.text }]}>{money(debt.amountMinor)}</Text>
        <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
          <View style={[styles.fill, { width: `${percent}%`, backgroundColor: statusColor }]} />
        </View>
        <View style={styles.row}>
          <Text style={{ color: theme.textMuted, fontSize: 13 }}>{t('debt.paid', { amount: money(paidMinor) })}</Text>
          <Text style={{ color: statusColor, fontSize: 13, fontWeight: '700' }}>
            {status === 'paid' ? t('debt.settled') : t('debt.remaining', { amount: money(remaining) })}
          </Text>
        </View>
        {status === 'overdue' && <Text style={{ color: theme.danger, fontWeight: '700' }}>{t('debt.overdue')}</Text>}
        {debt.dueDate && (
          <Text style={{ color: theme.textMuted, fontSize: 13 }}>
            {t('debt.dueOn', { date: formatDateForLanguage(debt.dueDate, language) })}
          </Text>
        )}
        {debt.note ? <Text style={{ color: theme.text }}>{debt.note}</Text> : null}
      </View>

      {status !== 'paid' && (
        <>
          <TextField
            label={t('debt.addPayment')}
            prefix={currency}
            value={amount}
            amount
        onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
          {error && <Text style={{ color: theme.danger }}>{error}</Text>}
          <Button label={t('debt.addPayment')} onPress={submitPayment} />
        </>
      )}

      <View style={{ gap: 10 }}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('debt.payments')}</Text>
        {payments.length === 0 ? (
          <Text style={{ color: theme.textMuted, fontSize: 13 }}>{t('debt.noPayments')}</Text>
        ) : (
          payments.map((payment) => (
            <ListRow
              key={payment.id}
              icon="cash-check"
              color={theme.income}
              title={money(payment.amountMinor)}
              subtitle={formatDateForLanguage(payment.date, language)}
              onPress={() => confirmRemovePayment(payment.id)}
            />
          ))
        )}
      </View>

      <Button
        label={t('common.edit')}
        variant="secondary"
        onPress={() => router.push({ pathname: '/debts/edit', params: { id: debt.id } })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: spacing.lg, gap: 8 },
  amount: { fontSize: 30, fontWeight: '800' },
  track: { height: 8, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
});
