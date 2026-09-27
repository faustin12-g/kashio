import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { addDays, addMonths, endOfMonth, startOfMonth, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { ListRow } from '../components/ListRow';
import { TransactionRow } from '../components/TransactionRow';
import { fonts } from '../constants/fonts';
import { useTheme } from '../constants/theme';
import { resolveCategoryIcon } from '../constants/categoryIcons';
import { useMoney } from '../hooks/useMoney';
import { categoryDisplayName, formatDateForLanguage, formatMonthForLanguage, weekdayShortLabels } from '../i18n';
import { useTranslation } from '../i18n/useTranslation';
import { useCategoriesStore } from '../store/categoriesStore';
import { useDebtsStore } from '../store/debtsStore';
import { useRecurringStore } from '../store/recurringStore';
import { dailyTotals, listTransactions } from '../repositories/transactionsRepository';
import { debtRemaining } from '../services/goalsAndDebts';
import { occurrencesInRange } from '../services/recurring';
import { toIsoDate, todayIso } from '../utils/date';
import type { Recurring, Transaction } from '../models/types';

interface DayInfo {
  iso: string;
  inMonth: boolean;
  incomeMinor: number;
  expenseMinor: number;
  dueCount: number;
}

interface DueRecurringItem {
  rule: Recurring;
  index: number;
}

interface DueDebtItem {
  id: string;
  person: string;
  direction: 'owed_to_me' | 'i_owe';
  remainingMinor: number;
}

export default function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { t, language } = useTranslation();
  const money = useMoney();
  const categories = useCategoriesStore((state) => state.categories);
  const rules = useRecurringStore((state) => state.rules);
  const loadRecurring = useRecurringStore((state) => state.load);
  const record = useRecurringStore((state) => state.record);
  const skip = useRecurringStore((state) => state.skip);
  const debts = useDebtsStore((state) => state.debts);
  const loadDebts = useDebtsStore((state) => state.load);

  const today = todayIso();
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(parseISO(today)));
  const [selectedDate, setSelectedDate] = useState(today);
  const [totals, setTotals] = useState<Map<string, { incomeMinor: number; expenseMinor: number }>>(new Map());
  const [dayTransactions, setDayTransactions] = useState<Transaction[]>([]);

  const monthStart = toIsoDate(startOfMonth(monthAnchor));
  const monthEnd = toIsoDate(endOfMonth(monthAnchor));
  // The grid always shows full weeks, so it can spill a few days into the surrounding months.
  const gridStart = toIsoDate(startOfWeek(startOfMonth(monthAnchor), { weekStartsOn: 1 }));
  const gridEnd = toIsoDate(endOfWeek(endOfMonth(monthAnchor), { weekStartsOn: 1 }));

  useFocusEffect(
    useCallback(() => {
      loadRecurring(db);
      loadDebts(db);
    }, [db, loadRecurring, loadDebts])
  );

  useEffect(() => {
    let cancelled = false;
    dailyTotals(db, gridStart, gridEnd).then((rows) => {
      if (cancelled) return;
      setTotals(new Map(rows.map((row) => [row.date, row])));
    });
    return () => {
      cancelled = true;
    };
  }, [db, gridStart, gridEnd]);

  useEffect(() => {
    let cancelled = false;
    listTransactions(db, { from: selectedDate, to: selectedDate }).then((rows) => {
      if (!cancelled) setDayTransactions(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [db, selectedDate]);

  // Every recurring occurrence and debt due date that falls anywhere in the visible grid.
  const dueByDate = useMemo(() => {
    const map = new Map<string, { recurring: DueRecurringItem[]; debts: DueDebtItem[] }>();
    const entry = (date: string) => {
      let value = map.get(date);
      if (!value) {
        value = { recurring: [], debts: [] };
        map.set(date, value);
      }
      return value;
    };
    for (const rule of rules) {
      for (const occurrence of occurrencesInRange(rule, gridStart, gridEnd)) {
        entry(occurrence.date).recurring.push({ rule, index: occurrence.index });
      }
    }
    for (const { debt, paidMinor } of debts) {
      if (!debt.dueDate || debt.dueDate < gridStart || debt.dueDate > gridEnd) continue;
      const remainingMinor = debtRemaining(debt.amountMinor, paidMinor);
      if (remainingMinor <= 0) continue;
      entry(debt.dueDate).debts.push({ id: debt.id, person: debt.person, direction: debt.direction, remainingMinor });
    }
    return map;
  }, [rules, debts, gridStart, gridEnd]);

  const days = useMemo<DayInfo[]>(() => {
    const list: DayInfo[] = [];
    let cursor = parseISO(gridStart);
    const end = parseISO(gridEnd);
    while (cursor <= end) {
      const iso = toIsoDate(cursor);
      const total = totals.get(iso);
      const due = dueByDate.get(iso);
      list.push({
        iso,
        inMonth: iso >= monthStart && iso <= monthEnd,
        incomeMinor: total?.incomeMinor ?? 0,
        expenseMinor: total?.expenseMinor ?? 0,
        dueCount: (due?.recurring.length ?? 0) + (due?.debts.length ?? 0),
      });
      cursor = addDays(cursor, 1);
    }
    return list;
  }, [gridStart, gridEnd, monthStart, monthEnd, totals, dueByDate]);

  const nameOfRule = (rule: Recurring) => {
    const category = categories.find((entry) => entry.id === rule.categoryId);
    return rule.note || (category ? categoryDisplayName(category.name, t) : t('tx.uncategorized'));
  };

  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const selectedDue = dueByDate.get(selectedDate);
  const isPastOrToday = selectedDate <= today;
  const hasNothing = dayTransactions.length === 0 && !selectedDue?.recurring.length && !selectedDue?.debts.length;

  return (
    <Screen>
      <Stack.Screen options={{ title: t('cal.title') }} />

      <View style={styles.monthRow}>
        <Pressable
          onPress={() => setMonthAnchor((current) => startOfMonth(addMonths(current, -1)))}
          hitSlop={10}
          accessibilityLabel={t('cal.prevMonth')}
        >
          <Icon name="chevron-left" size={26} color={theme.text} />
        </Pressable>
        <Text style={[styles.monthLabel, { color: theme.text }]}>{formatMonthForLanguage(monthStart, language)}</Text>
        <Pressable
          onPress={() => setMonthAnchor((current) => startOfMonth(addMonths(current, 1)))}
          hitSlop={10}
          accessibilityLabel={t('cal.nextMonth')}
        >
          <Icon name="chevron-right" size={26} color={theme.text} />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {weekdayShortLabels(language).map((label, index) => (
          <Text key={index} style={[styles.weekdayLabel, { color: theme.textMuted }]}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day) => {
          const isSelected = day.iso === selectedDate;
          const isToday = day.iso === today;
          const hasIncome = day.incomeMinor > 0;
          const hasExpense = day.expenseMinor > 0;
          return (
            <Pressable
              key={day.iso}
              onPress={() => setSelectedDate(day.iso)}
              style={[
                styles.dayCell,
                isSelected && { backgroundColor: theme.primary },
                !isSelected && isToday && { borderColor: theme.primary, borderWidth: 1.5 },
              ]}
            >
              <Text
                style={{
                  color: isSelected ? theme.primaryText : day.inMonth ? theme.text : theme.textMuted,
                  fontFamily: isToday ? fonts.extrabold : fonts.regular,
                  fontSize: 14,
                  opacity: day.inMonth ? 1 : 0.4,
                }}
              >
                {Number(day.iso.slice(8, 10))}
              </Text>
              <View style={styles.dayMarkers}>
                {hasIncome && (
                  <View style={[styles.dot, { backgroundColor: isSelected ? theme.primaryText : theme.income }]} />
                )}
                {hasExpense && (
                  <View style={[styles.dot, { backgroundColor: isSelected ? theme.primaryText : theme.expense }]} />
                )}
                {day.dueCount > 0 && (
                  <Icon name="bell-outline" size={9} color={isSelected ? theme.primaryText : theme.primary} />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={{ gap: 12 }}>
        <Text style={[styles.selectedTitle, { color: theme.text }]}>
          {formatDateForLanguage(selectedDate, language)}
          {selectedDate === today ? ` · ${t('common.today')}` : ''}
        </Text>

        {hasNothing ? (
          <EmptyState icon="calendar-blank-outline" title={t('cal.nothingTitle')} message={t('cal.nothingHint')} />
        ) : (
          <>
            {(selectedDue?.recurring.length ?? 0) > 0 || (selectedDue?.debts.length ?? 0) > 0 ? (
              <View style={{ gap: 8 }}>
                <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>{t('cal.due')}</Text>
                {selectedDue?.recurring.map(({ rule, index }) => {
                  const category = categoryById.get(rule.categoryId ?? '');
                  return (
                    <View
                      key={`${rule.id}:${index}`}
                      style={[styles.dueCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    >
                      <View style={[styles.dueIcon, { backgroundColor: (category?.color ?? theme.primary) + '22' }]}>
                        <Icon
                          name={category ? resolveCategoryIcon(category.icon) : 'autorenew'}
                          size={18}
                          color={category?.color ?? theme.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.text, fontFamily: fonts.semibold, fontSize: 14 }} numberOfLines={1}>
                          {nameOfRule(rule)}
                        </Text>
                        <Text
                          style={{
                            color: rule.type === 'income' ? theme.income : theme.expense,
                            fontFamily: fonts.bold,
                            fontSize: 13,
                          }}
                        >
                          {rule.type === 'income' ? '+' : '−'}
                          {money(rule.amountMinor)}
                        </Text>
                      </View>
                      {isPastOrToday && (
                        <View style={styles.dueButtons}>
                          <Button label={t('rec.record')} onPress={() => record(db, rule.id)} />
                          <Button label={t('common.skip')} variant="secondary" onPress={() => skip(db, rule.id)} />
                        </View>
                      )}
                    </View>
                  );
                })}
                {selectedDue?.debts.map((item) => (
                  <ListRow
                    key={item.id}
                    icon="handshake-outline"
                    color={item.direction === 'owed_to_me' ? theme.income : theme.expense}
                    title={item.person}
                    subtitle={item.direction === 'owed_to_me' ? t('debt.owedToMe') : t('debt.iOwe')}
                    trailing={money(item.remainingMinor)}
                    trailingColor={item.direction === 'owed_to_me' ? theme.income : theme.expense}
                    onPress={() => router.push({ pathname: '/debts/detail', params: { id: item.id } })}
                  />
                ))}
              </View>
            ) : null}

            {dayTransactions.length > 0 && (
              <View style={{ gap: 8 }}>
                <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>{t('cal.transactions')}</Text>
                {dayTransactions.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    category={transaction.categoryId ? (categoryById.get(transaction.categoryId) ?? null) : null}
                    onPress={() => router.push(`/transactions/${transaction.id}`)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthLabel: { fontSize: 17, fontFamily: fonts.bold },
  weekdayRow: { flexDirection: 'row' },
  weekdayLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontFamily: fonts.semibold },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    gap: 3,
  },
  dayMarkers: { flexDirection: 'row', gap: 3, alignItems: 'center', height: 9 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  selectedTitle: { fontSize: 16, fontFamily: fonts.bold },
  sectionLabel: { fontSize: 13, fontFamily: fonts.semibold, textTransform: 'uppercase', letterSpacing: 0.4 },
  dueCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, padding: 12 },
  dueIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dueButtons: { gap: 6 },
});
