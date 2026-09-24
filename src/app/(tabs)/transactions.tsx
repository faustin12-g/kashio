import React, { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../components/Screen';
import { TransactionRow } from '../../components/TransactionRow';
import { EmptyState } from '../../components/EmptyState';
import { useTransactionsStore } from '../../store/transactionsStore';
import { useCategoriesStore } from '../../store/categoriesStore';

export default function TransactionsScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const transactions = useTransactionsStore((state) => state.transactions);
  const loadTransactions = useTransactionsStore((state) => state.load);
  const categories = useCategoriesStore((state) => state.categories);

  useFocusEffect(
    useCallback(() => {
      loadTransactions(db, {});
    }, [db, loadTransactions])
  );

  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  return (
    <Screen scroll={false}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <TransactionRow
            transaction={item}
            category={item.categoryId ? (categoryById.get(item.categoryId) ?? null) : null}
            onPress={() => router.push(`/transactions/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <EmptyState icon="💸" title="No transactions yet" message="Tap the + button on the dashboard to add one." />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
});
