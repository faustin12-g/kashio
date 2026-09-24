import React, { useCallback, useMemo } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { BudgetProgressCard } from '../../components/BudgetProgressCard';
import { EmptyState } from '../../components/EmptyState';
import { spacing } from '../../constants/theme';
import { useBudgetsStore } from '../../store/budgetsStore';
import { useCategoriesStore } from '../../store/categoriesStore';

export default function BudgetsScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const progress = useBudgetsStore((state) => state.progress);
  const load = useBudgetsStore((state) => state.load);
  const remove = useBudgetsStore((state) => state.remove);
  const categories = useCategoriesStore((state) => state.categories);

  useFocusEffect(
    useCallback(() => {
      load(db);
    }, [db, load])
  );

  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  const handleLongPress = (id: string) => {
    Alert.alert('Delete budget?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(db, id) },
    ]);
  };

  return (
    <Screen scroll={false}>
      <FlatList
        data={progress}
        keyExtractor={(item) => item.budget.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <Pressable onLongPress={() => handleLongPress(item.budget.id)}>
            <BudgetProgressCard
              progress={item}
              category={item.budget.categoryId ? (categoryById.get(item.budget.categoryId) ?? null) : null}
            />
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState icon="🎯" title="No budgets yet" message="Set a spending limit to start tracking against it." />
        }
      />
      <View style={styles.footer}>
        <Button label="New budget" onPress={() => router.push('/budgets/new')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg },
  footer: { padding: spacing.lg },
});
