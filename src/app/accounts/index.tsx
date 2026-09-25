import React, { useCallback, useMemo } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ListRow } from '../../components/ListRow';
import type { IconName } from '../../components/Icon';
import { useTheme, spacing } from '../../constants/theme';
import { useMoney } from '../../hooks/useMoney';
import { formatDateForLanguage } from '../../i18n';
import { useTranslation } from '../../i18n/useTranslation';
import { useAccountsStore } from '../../store/accountsStore';

export default function AccountsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { t, language } = useTranslation();
  const money = useMoney();
  const { accounts, balances, transfers, load, removeTransfer } = useAccountsStore();

  useFocusEffect(
    useCallback(() => {
      load(db);
    }, [db, load])
  );

  const accountById = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);
  const total = accounts.reduce((sum, account) => sum + (balances[account.id] ?? account.openingBalanceMinor), 0);

  const confirmDeleteTransfer = (id: string) => {
    Alert.alert(t('common.delete'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => removeTransfer(db, id) },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('acc.title') }} />

      {accounts.length > 0 && (
        <View style={[styles.totalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.totalLabel, { color: theme.textMuted }]}>{t('acc.total')}</Text>
          <Text style={[styles.totalValue, { color: total < 0 ? theme.danger : theme.text }]}>{money(total)}</Text>
        </View>
      )}

      {accounts.length === 0 ? (
        <EmptyState icon="wallet-outline" title={t('acc.empty')} message={t('acc.emptyHint')} />
      ) : (
        <View style={{ gap: 10 }}>
          {accounts.map((account) => {
            const balance = balances[account.id] ?? account.openingBalanceMinor;
            return (
              <ListRow
                key={account.id}
                icon={account.icon as IconName}
                color={account.color}
                title={account.name}
                subtitle={t(`acc.type.${account.type}` as const)}
                trailing={money(balance)}
                trailingColor={balance < 0 ? theme.danger : theme.text}
                onPress={() => router.push({ pathname: '/accounts/edit', params: { id: account.id } })}
              />
            );
          })}
        </View>
      )}

      <View style={styles.buttons}>
        <Button label={t('acc.new')} onPress={() => router.push('/accounts/edit')} />
        {accounts.length >= 2 ? (
          <Button label={t('acc.transfer')} variant="secondary" onPress={() => router.push('/accounts/transfer')} />
        ) : accounts.length === 1 ? (
          <Text style={{ color: theme.textMuted, fontSize: 13, textAlign: 'center' }}>{t('acc.needTwo')}</Text>
        ) : null}
      </View>

      {transfers.length > 0 && (
        <View style={{ gap: 10 }}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('acc.recentTransfers')}</Text>
          {transfers.slice(0, 10).map((transfer) => (
            <ListRow
              key={transfer.id}
              icon="swap-horizontal"
              color={theme.primary}
              title={`${accountById.get(transfer.fromAccountId)?.name ?? '?'} → ${accountById.get(transfer.toAccountId)?.name ?? '?'}`}
              subtitle={transfer.note || formatDateForLanguage(transfer.date, language)}
              trailing={money(transfer.amountMinor)}
              onPress={() => confirmDeleteTransfer(transfer.id)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  totalCard: { borderRadius: 16, borderWidth: 1, padding: spacing.lg, gap: 4 },
  totalLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalValue: { fontSize: 30, fontWeight: '800' },
  buttons: { gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
});
