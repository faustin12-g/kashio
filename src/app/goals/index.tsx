import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ProgressRing } from '../../components/ProgressRing';
import { useTheme, spacing } from '../../constants/theme';
import { useMoney } from '../../hooks/useMoney';
import { useTranslation } from '../../i18n/useTranslation';
import { useGoalsStore } from '../../store/goalsStore';
import { goalPercent, isGoalReached } from '../../services/goalsAndDebts';

export default function GoalsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const money = useMoney();
  const goals = useGoalsStore((state) => state.goals);
  const load = useGoalsStore((state) => state.load);

  useFocusEffect(
    useCallback(() => {
      load(db);
    }, [db, load])
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: t('goal.title') }} />

      {goals.length === 0 ? (
        <EmptyState icon="piggy-bank-outline" title={t('goal.empty')} message={t('goal.emptyHint')} />
      ) : (
        <View style={{ gap: 10 }}>
          {goals.map(({ goal, savedMinor }) => {
            const percent = goalPercent(savedMinor, goal.targetMinor);
            const reached = isGoalReached(savedMinor, goal.targetMinor);
            return (
              <Pressable
                key={goal.id}
                onPress={() => router.push({ pathname: '/goals/detail', params: { id: goal.id } })}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <ProgressRing percent={percent} color={reached ? theme.income : goal.color} />
                <View style={styles.text}>
                  <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                    {goal.name}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 13 }}>
                    {t('goal.saved', { saved: money(savedMinor), target: money(goal.targetMinor) })}
                  </Text>
                  {reached && (
                    <Text style={{ color: theme.income, fontSize: 13, fontWeight: '700' }}>{t('goal.reached')}</Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <Button label={t('goal.new')} onPress={() => router.push('/goals/edit')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
  },
  text: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '700' },
});
