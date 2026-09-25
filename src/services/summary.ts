import type { SQLiteDatabase } from 'expo-sqlite';
import { totalOpeningBalance } from '../repositories/accountsRepository';
import { sumTotal } from '../repositories/transactionsRepository';

export interface Summary {
  incomeMinor: number;
  expenseMinor: number;
  /** What you have: opening balances (if any) plus income minus spending. Negative when more has gone out than came in. */
  balanceMinor: number;
}

export function buildSummary(incomeMinor: number, expenseMinor: number, openingMinor = 0): Summary {
  return { incomeMinor, expenseMinor, balanceMinor: openingMinor + incomeMinor - expenseMinor };
}

/**
 * Total income, total expenses and the balance, either across everything
 * ever recorded or within an inclusive date range. The money accounts held
 * when tracking started counts towards the balance only for "everything",
 * since it did not arrive during any particular month.
 */
export async function getSummary(
  db: SQLiteDatabase,
  range: { from?: string; to?: string } = {},
  options: { includeOpeningBalance?: boolean } = {}
): Promise<Summary> {
  const [incomeMinor, expenseMinor, openingMinor] = await Promise.all([
    sumTotal(db, { ...range, type: 'income' }),
    sumTotal(db, { ...range, type: 'expense' }),
    options.includeOpeningBalance ? totalOpeningBalance(db) : Promise.resolve(0),
  ]);
  return buildSummary(incomeMinor, expenseMinor, openingMinor);
}
