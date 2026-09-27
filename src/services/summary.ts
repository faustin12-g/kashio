import type { SQLiteDatabase } from 'expo-sqlite';
import { sumTotal } from '../repositories/transactionsRepository';

export interface Summary {
  incomeMinor: number;
  expenseMinor: number;
  /** Income minus spending. "Money I already had" is itself an income entry, so it is already included. */
  balanceMinor: number;
}

export function buildSummary(incomeMinor: number, expenseMinor: number): Summary {
  return { incomeMinor, expenseMinor, balanceMinor: incomeMinor - expenseMinor };
}

/** Total income, total expenses and the balance, either across everything ever recorded or within an inclusive date range. */
export async function getSummary(db: SQLiteDatabase, range: { from?: string; to?: string } = {}): Promise<Summary> {
  const [incomeMinor, expenseMinor] = await Promise.all([
    sumTotal(db, { ...range, type: 'income' }),
    sumTotal(db, { ...range, type: 'expense' }),
  ]);
  return buildSummary(incomeMinor, expenseMinor);
}
