import type { SQLiteDatabase } from 'expo-sqlite';
import type { Budget, BudgetProgress } from '../models/types';
import { listBudgets } from '../repositories/budgetsRepository';
import { sumTotal } from '../repositories/transactionsRepository';
import { currentPeriodRange, todayIso } from '../utils/date';

async function progressForBudget(db: SQLiteDatabase, budget: Budget): Promise<BudgetProgress> {
  // A "once" budget never resets: it tracks everything from the day it was set up onward, with no end.
  const { start, end } =
    budget.period === 'once'
      ? { start: budget.startDate, end: null }
      : currentPeriodRange(budget.period, budget.startDate, todayIso());

  const spentMinor = await sumTotal(db, {
    from: start,
    to: end ?? undefined,
    type: 'expense',
    categoryId: budget.categoryId ?? undefined,
    excludeOpeningBalance: true,
  });

  const remainingMinor = budget.amountLimitMinor - spentMinor;
  const percentUsed = budget.amountLimitMinor > 0 ? (spentMinor / budget.amountLimitMinor) * 100 : 0;

  return {
    budget,
    periodStart: start,
    periodEnd: end,
    spentMinor,
    remainingMinor,
    percentUsed,
  };
}

/** Computes live spend-vs-limit for every active budget, for the period containing today (or, for a "once" budget, all time since it started). */
export async function listBudgetProgress(db: SQLiteDatabase): Promise<BudgetProgress[]> {
  const budgets = await listBudgets(db);
  return Promise.all(budgets.map((budget) => progressForBudget(db, budget)));
}

export interface TotalBudgetProgress {
  limitMinor: number;
  spentMinor: number;
  percentUsed: number;
  /** How many budgets contributed. 0 means there is nothing to show a total for. */
  count: number;
}

/**
 * Adds every monthly and one-time budget's limit and spending together, for
 * one "how am I doing overall" figure. Weekly budgets are left out: a weekly
 * cap and a monthly cap are not the same unit, so adding them would overstate
 * or understate the total rather than mean anything real.
 */
export function combineBudgetProgress(progressList: BudgetProgress[]): TotalBudgetProgress {
  const combinable = progressList.filter((entry) => entry.budget.period !== 'weekly');
  const limitMinor = combinable.reduce((sum, entry) => sum + entry.budget.amountLimitMinor, 0);
  const spentMinor = combinable.reduce((sum, entry) => sum + entry.spentMinor, 0);
  return {
    limitMinor,
    spentMinor,
    percentUsed: limitMinor > 0 ? (spentMinor / limitMinor) * 100 : 0,
    count: combinable.length,
  };
}
