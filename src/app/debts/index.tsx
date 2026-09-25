import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ListRow } from '../../components/ListRow';
import { SegmentedControl } from '../../components/SegmentedControl';
import { useTheme, spacing } from '../../constants/theme';
import { useMoney } from '../../hooks/useMoney';
import { formatDateForLanguage } from '../../i18n';
import { useTranslation } from '../../i18n/useTranslation';
import { useDebtsStore } from '../../store/debtsStore';
import { debtRemaining, debtStatus } from '../../services/goalsAndDebts';
import { todayIso } from '../../utils/date';
import type { DebtDirection } from '../../models/types';

export default function DebtsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { t, language } = useTranslation();
  const money = useMoney();
  const debts = useDebtsStore((state) => state.debts);
  const load = useDebtsStore((state) => state.load);
  const [direction, setDirection] = useState<DebtDirection>('owed_to_me');

  useFocusEffect(
    useCallback(() => {
      load(db);
    }, [db, load])
  );

  const today = todayIso();
  const visible = useMemo(
    () =>
      debts
        .filter((entry) => entry.debt.direction === direction)
        // Money still outstanding first, settled debts last.
        .sort(
          (a, b) =>
            Number(debtRemaining(a.debt.amountMinor, a.paidMinor) === 0) -
            Number(debtRemaining(b.debt.amountMinor, b.paidMinor) === 0)
        ),
    [debts, direction]
  );
  const outstanding = visible.reduce((sum, entry) => sum + debtRemaining(entry.debt.amountMinor, entry.paidMinor), 0);

  return (
    <Screen>
      <Stack.Screen options={{ title: t('debt.title') }} />

      <SegmentedControl
        value={direction}
        onChange={setDirection}
        options={[
          { value: 'owed_to_me', label: t('debt.owedToMe'), icon: 'arrow-down-circle-outline' },
          { value: 'i_owe', label: t('debt.iOwe'), icon: 'arrow-up-circle-outline' },
        ]}
      />

      <View style={[styles.total, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.totalLabel, { color: theme.textMuted }]}>
          {direction === 'owed_to_me' ? t('debt.totalOwedToMe') : t('debt.totalIOwe')}
        </Text>
        <Text style={[styles.totalValue, { color: direction === 'owed_to_me' ? theme.income : theme.expense }]}>
          {money(outstanding)}
        </Text>
      </View>

      {visible.length === 0 ? (
        <EmptyState icon="handshake-outline" title={t('debt.empty')} message={t('debt.emptyHint')} />
      ) : (
        <View style={{ gap: 10 }}>
          {visible.map(({ debt, paidMinor }) => {
            const remaining = debtRemaining(debt.amountMinor, paidMinor);
            const status = debtStatus(debt.amountMinor, paidMinor, debt.dueDate, today);
            const subtitle =
              status === 'paid'
                ? t('debt.settled')
                : status === 'overdue'
                  ? `${t('debt.overdue')} · ${t('debt.dueOn', { date: formatDateForLanguage(debt.dueDate!, language) })}`
                  : debt.dueDate
                    ? t('debt.dueOn', { date: formatDateForLanguage(debt.dueDate, language) })
                    : formatDateForLanguage(debt.date, language);
            return (
              <ListRow
                key={debt.id}
                icon={status === 'paid' ? 'check-circle-outline' : 'account-outline'}
                color={status === 'paid' ? theme.income : status === 'overdue' ? theme.danger : theme.primary}
                title={debt.person}
                subtitle={subtitle}
                trailing={status === 'paid' ? money(debt.amountMinor) : money(remaining)}
                trailingSubtitle={status === 'paid' ? undefined : t('debt.remaining', { amount: '' }).trim() || undefined}
                onPress={() => router.push({ pathname: '/debts/detail', params: { id: debt.id } })}
              />
            );
          })}
        </View>
      )}

      <Button label={t('debt.new')} onPress={() => router.push('/debts/edit')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  total: { borderRadius: 16, borderWidth: 1, padding: spacing.lg, gap: 4 },
  totalLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalValue: { fontSize: 30, fontWeight: '800' },
});
