import type { SQLiteDatabase } from 'expo-sqlite';
import type { Budget, BudgetProgress } from '../models/types';
import { listBudgets } from '../repositories/budgetsRepository';
import { sumTotal } from '../repositories/transactionsRepository';
import { currentPeriodRange, todayIso } from '../utils/date';

async function progressForBudget(db: SQLiteDatabase, budget: Budget): Promise<BudgetProgress> {
  const { start, end } = currentPeriodRange(budget.period, budget.startDate, todayIso());

  const spentMinor = await sumTotal(db, {
    from: start,
    to: end,
    type: 'expense',
    categoryId: budget.categoryId ?? undefined,
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

/** Computes live spend-vs-limit for every active budget, for the period containing today. */
export async function listBudgetProgress(db: SQLiteDatabase): Promise<BudgetProgress[]> {
  const budgets = await listBudgets(db);
  return Promise.all(budgets.map((budget) => progressForBudget(db, budget)));
}
