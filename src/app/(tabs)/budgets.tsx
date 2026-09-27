import React, { useCallback, useMemo } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { BudgetProgressCard } from '../../components/BudgetProgressCard';
import { EmptyState } from '../../components/EmptyState';
import { fonts } from '../../constants/fonts';
import { spacing, useTheme } from '../../constants/theme';
import { useMoney } from '../../hooks/useMoney';
import { combineBudgetProgress } from '../../services/budgetProgress';
import { useTranslation } from '../../i18n/useTranslation';
import { useBudgetsStore } from '../../store/budgetsStore';
import { useCategoriesStore } from '../../store/categoriesStore';
import { useUndoStore } from '../../store/undoStore';

export default function BudgetsScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const theme = useTheme();
  const money = useMoney();
  const { t } = useTranslation();
  const progress = useBudgetsStore((state) => state.progress);
  const load = useBudgetsStore((state) => state.load);
  const remove = useBudgetsStore((state) => state.remove);
  const categories = useCategoriesStore((state) => state.categories);

  useFocusEffect(
    useCallback(() => {
      load(db);
    }, [db, load])
  );

  const total = useMemo(() => combineBudgetProgress(progress), [progress]);
  const totalOver = total.percentUsed > 100;
  const totalBarColor = totalOver ? theme.danger : total.percentUsed > 80 ? theme.warning : theme.primary;

  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  const handleLongPress = (id: string) => {
    Alert.alert(t('bud.deleteTitle'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await remove(db, id);
          useUndoStore.getState().show(t('undo.budgetDeleted'), () => {
            void useBudgetsStore.getState().restore(db, id);
          });
        },
      },
    ]);
  };

  return (
    <Screen scroll={false}>
      <FlatList
        data={progress}
        keyExtractor={(item) => item.budget.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          total.count > 0 ? (
            <View style={[styles.totalCard, { backgroundColor: theme.primary + '14', borderColor: theme.primary + '33' }]}>
              <Text style={[styles.totalLabel, { color: theme.textMuted }]}>{t('bud.totalTitle')}</Text>
              <Text style={[styles.totalValue, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
                {money(total.limitMinor)}
              </Text>
              <View style={[styles.totalTrack, { backgroundColor: theme.surface }]}>
                <View
                  style={[styles.totalFill, { width: `${Math.min(total.percentUsed, 100)}%`, backgroundColor: totalBarColor }]}
                />
              </View>
              <View style={styles.totalFooter}>
                <Text style={{ color: theme.textMuted, fontSize: 13, flexShrink: 1 }}>
                  {t('bud.ofLimit', { spent: money(total.spentMinor), limit: money(total.limitMinor) })}
                </Text>
                <Text style={{ color: totalOver ? theme.danger : theme.textMuted, fontSize: 13, fontFamily: fonts.semibold }}>
                  {totalOver ? t('bud.overBudget') : `${Math.round(total.percentUsed)}%`}
                </Text>
              </View>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable onLongPress={() => handleLongPress(item.budget.id)}>
            <BudgetProgressCard
              progress={item}
              category={item.budget.categoryId ? (categoryById.get(item.budget.categoryId) ?? null) : null}
            />
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState icon="bullseye-arrow" title={t('bud.empty')} message={t('bud.emptyHint')} />
        }
      />
      <View style={styles.footer}>
        <Button label={t('bud.new')} onPress={() => router.push('/budgets/new')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg },
  footer: { padding: spacing.lg },
  totalCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8, marginBottom: 12 },
  totalLabel: { fontSize: 12, fontFamily: fonts.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  totalValue: { fontSize: 28, fontFamily: fonts.extrabold },
  totalTrack: { height: 8, borderRadius: 999, overflow: 'hidden' },
  totalFill: { height: '100%', borderRadius: 999 },
  totalFooter: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
});
