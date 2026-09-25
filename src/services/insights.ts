import { format, parseISO, subMonths } from 'date-fns';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  monthlyTotals,
  sumByCategory,
  sumsByType,
  type CategoryTotal,
  type MonthlyTotal,
} from '../repositories/transactionsRepository';

/** The last `count` months ending at `endMonth` (yyyy-MM), oldest first, with zeros for months that had nothing. */
export function buildMonthSeries(totals: MonthlyTotal[], endMonth: string, count: number): MonthlyTotal[] {
  const byMonth = new Map(totals.map((entry) => [entry.month, entry]));
  const end = parseISO(`${endMonth}-01`);
  const series: MonthlyTotal[] = [];
  for (let offset = count - 1; offset >= 0; offset--) {
    const month = format(subMonths(end, offset), 'yyyy-MM');
    series.push(byMonth.get(month) ?? { month, incomeMinor: 0, expenseMinor: 0 });
  }
  return series;
}

export interface Change {
  deltaMinor: number;
  /** Change as a percentage of the previous value, or null when there was nothing to compare against. */
  percent: number | null;
}

export function compareValues(currentMinor: number, previousMinor: number): Change {
  const deltaMinor = currentMinor - previousMinor;
  const percent = previousMinor > 0 ? Math.round((deltaMinor / previousMinor) * 100) : null;
  return { deltaMinor, percent };
}

export interface CategoryChange {
  categoryId: string | null;
  currentMinor: number;
  previousMinor: number;
  deltaMinor: number;
}

/** The categories whose spending changed the most between two periods, biggest swing first. */
export function topCategoryChanges(
  current: CategoryTotal[],
  previous: CategoryTotal[],
  limit: number
): CategoryChange[] {
  const currentBy = new Map(current.map((entry) => [entry.categoryId, entry.totalMinor]));
  const previousBy = new Map(previous.map((entry) => [entry.categoryId, entry.totalMinor]));
  const ids = new Set<string | null>([...currentBy.keys(), ...previousBy.keys()]);

  return [...ids]
    .map((categoryId) => {
      const currentMinor = currentBy.get(categoryId) ?? 0;
      const previousMinor = previousBy.get(categoryId) ?? 0;
      return { categoryId, currentMinor, previousMinor, deltaMinor: currentMinor - previousMinor };
    })
    .filter((change) => change.deltaMinor !== 0)
    .sort((a, b) => Math.abs(b.deltaMinor) - Math.abs(a.deltaMinor))
    .slice(0, limit);
}

/** First and last day (yyyy-MM-dd) of a yyyy-MM month. */
export function monthBounds(month: string): { from: string; to: string } {
  const start = parseISO(`${month}-01`);
  const next = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  return { from: `${month}-01`, to: format(next, 'yyyy-MM-dd') };
}

export interface Insights {
  series: MonthlyTotal[];
  thisMonth: { incomeMinor: number; expenseMinor: number };
  lastMonth: { incomeMinor: number; expenseMinor: number };
  spendingChange: Change;
  incomeChange: Change;
  categoryChanges: CategoryChange[];
  topCategories: CategoryTotal[];
}

/** Everything the Insights screen shows, gathered in one go. */
export async function loadInsights(db: SQLiteDatabase, todayIso: string): Promise<Insights> {
  const thisMonthKey = todayIso.slice(0, 7);
  const lastMonthKey = format(subMonths(parseISO(`${thisMonthKey}-01`), 1), 'yyyy-MM');
  const sixMonthsAgo = format(subMonths(parseISO(`${thisMonthKey}-01`), 5), 'yyyy-MM');
  const thisBounds = monthBounds(thisMonthKey);
  const lastBounds = monthBounds(lastMonthKey);

  const [totals, thisMonth, lastMonth, thisByCategory, lastByCategory] = await Promise.all([
    monthlyTotals(db, sixMonthsAgo),
    sumsByType(db, thisBounds),
    sumsByType(db, lastBounds),
    sumByCategory(db, { ...thisBounds, type: 'expense' }),
    sumByCategory(db, { ...lastBounds, type: 'expense' }),
  ]);

  return {
    series: buildMonthSeries(totals, thisMonthKey, 6),
    thisMonth,
    lastMonth,
    spendingChange: compareValues(thisMonth.expenseMinor, lastMonth.expenseMinor),
    incomeChange: compareValues(thisMonth.incomeMinor, lastMonth.incomeMinor),
    categoryChanges: topCategoryChanges(thisByCategory, lastByCategory, 3),
    topCategories: [...thisByCategory].sort((a, b) => b.totalMinor - a.totalMinor).slice(0, 5),
  };
}
