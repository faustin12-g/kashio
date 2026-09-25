import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { ListRow } from '../../components/ListRow';
import { useTheme, spacing } from '../../constants/theme';
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
  const dueItems = useRecurringStore((state) => state.dueItems);
  const load = useRecurringStore((state) => state.load);
  const record = useRecurringStore((state) => state.record);
  const skip = useRecurringStore((state) => state.skip);
  const categories = useCategoriesStore((state) => state.categories);

  useFocusEffect(
    useCallback(() => {
      load(db);
    }, [db, load])
  );

  const nameOf = (note: string, categoryId: string | null) => {
    const category = categories.find((entry) => entry.id === categoryId);
    return note || (category ? categoryDisplayName(category.name, t) : t('tx.uncategorized'));
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('rec.title') }} />

      <View style={[styles.note, { backgroundColor: theme.surfaceAlt }]}>
        <Icon name="bell-outline" size={18} color={theme.textMuted} />
        <Text style={{ flex: 1, color: theme.textMuted, fontSize: 13 }}>{t('rec.explain')}</Text>
      </View>

      {dueItems.length > 0 && (
        <View style={{ gap: 10 }}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('rec.dueNow')}</Text>
          {dueItems.map(({ rule, due }) => (
            <View
              key={rule.id}
              style={[styles.dueCard, { backgroundColor: theme.surface, borderColor: theme.primary }]}
            >
              <View style={styles.dueTop}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>
                    {nameOf(rule.note, rule.categoryId)}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 13 }}>
                    {t('rec.dueOn', { date: formatDateForLanguage(due[0].date, language) })}
                    {due.length > 1 ? ` · ${t('rec.moreWaiting', { count: due.length - 1 })}` : ''}
                  </Text>
                </View>
                <Text
                  style={{
                    color: rule.type === 'income' ? theme.income : theme.expense,
                    fontSize: 17,
                    fontWeight: '800',
                  }}
                >
                  {rule.type === 'income' ? '+' : '−'}
                  {money(rule.amountMinor)}
                </Text>
              </View>
              <View style={styles.dueButtons}>
                <View style={{ flex: 1 }}>
                  <Button label={t('rec.record')} onPress={() => record(db, rule.id)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label={t('common.skip')} variant="secondary" onPress={() => skip(db, rule.id)} />
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

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
            return (
              <ListRow
                key={rule.id}
                icon={category ? resolveCategoryIcon(category.icon) : 'autorenew'}
                color={category?.color ?? theme.primary}
                title={nameOf(rule.note, rule.categoryId)}
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

const styles = StyleSheet.create({
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  dueCard: { borderRadius: 16, borderWidth: 2, padding: spacing.lg, gap: 12 },
  dueTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dueButtons: { flexDirection: 'row', gap: 10 },
});
