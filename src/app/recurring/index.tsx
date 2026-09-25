import React, { useCallback } from 'react';
import { View } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ListRow } from '../../components/ListRow';
import { useTheme } from '../../constants/theme';
import { resolveCategoryIcon } from '../../constants/categoryIcons';
import { useMoney } from '../../hooks/useMoney';
import { categoryDisplayName, formatDateForLanguage } from '../../i18n';
import { useTranslation } from '../../i18n/useTranslation';
import { useCategoriesStore } from '../../store/categoriesStore';
import { useRecurringStore } from '../../store/recurringStore';
import { nextOccurrence } from '../../services/recurring';

export default function RecurringScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { t, language } = useTranslation();
  const money = useMoney();
  const rules = useRecurringStore((state) => state.rules);
  const load = useRecurringStore((state) => state.load);
  const categories = useCategoriesStore((state) => state.categories);

  useFocusEffect(
    useCallback(() => {
      load(db);
    }, [db, load])
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: t('rec.title') }} />

      {rules.length === 0 ? (
        <EmptyState icon="autorenew" title={t('rec.empty')} message={t('rec.emptyHint')} />
      ) : (
        <View style={{ gap: 10 }}>
          {rules.map((rule) => {
            const category = categories.find((entry) => entry.id === rule.categoryId);
            const next = nextOccurrence(rule);
            const subtitle = !rule.isActive
              ? t('rec.paused')
              : next
                ? t('rec.next', { date: formatDateForLanguage(next, language) })
                : t('rec.finished');
            const title = rule.note || (category ? categoryDisplayName(category.name, t) : t('tx.uncategorized'));
            return (
              <ListRow
                key={rule.id}
                icon={category ? resolveCategoryIcon(category.icon) : 'autorenew'}
                color={category?.color ?? theme.primary}
                title={title}
                subtitle={`${t(`rec.${rule.frequency}` as const)} · ${subtitle}`}
                trailing={`${rule.type === 'income' ? '+' : '−'}${money(rule.amountMinor)}`}
                trailingColor={rule.type === 'income' ? theme.income : theme.expense}
                onPress={() => router.push({ pathname: '/recurring/edit', params: { id: rule.id } })}
              />
            );
          })}
        </View>
      )}

      <Button label={t('rec.new')} onPress={() => router.push('/recurring/edit')} />
    </Screen>
  );
}
