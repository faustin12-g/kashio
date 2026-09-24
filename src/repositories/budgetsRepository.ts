import type { SQLiteDatabase } from 'expo-sqlite';
import type { Budget, NewBudget } from '../models/types';
import { generateId } from '../utils/id';

interface BudgetRow {
  id: string;
  category_id: string | null;
  amount_limit_minor: number;
  currency: string;
  period: 'weekly' | 'monthly';
  start_date: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

function fromRow(row: BudgetRow): Budget {
  return {
    id: row.id,
    categoryId: row.category_id,
    amountLimitMinor: row.amount_limit_minor,
    currency: row.currency,
    period: row.period,
    startDate: row.start_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function listBudgets(db: SQLiteDatabase): Promise<Budget[]> {
  const rows = await db.getAllAsync<BudgetRow>(
    'SELECT * FROM budgets WHERE deleted_at IS NULL ORDER BY created_at DESC'
  );
  return rows.map(fromRow);
}

export async function getBudget(db: SQLiteDatabase, id: string): Promise<Budget | null> {
  const row = await db.getFirstAsync<BudgetRow>(
    'SELECT * FROM budgets WHERE id = ? AND deleted_at IS NULL',
    id
  );
  return row ? fromRow(row) : null;
}

export async function createBudget(db: SQLiteDatabase, input: NewBudget): Promise<Budget> {
  const now = Date.now();
  const budget: Budget = { id: generateId(), ...input, createdAt: now, updatedAt: now, deletedAt: null };
  await db.runAsync(
    `INSERT INTO budgets
      (id, category_id, amount_limit_minor, currency, period, start_date, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    budget.id,
    budget.categoryId,
    budget.amountLimitMinor,
    budget.currency,
    budget.period,
    budget.startDate,
    budget.createdAt,
    budget.updatedAt
  );
  return budget;
}

export async function updateBudget(
  db: SQLiteDatabase,
  id: string,
  changes: Partial<NewBudget>
): Promise<void> {
  const current = await getBudget(db, id);
  if (!current) throw new Error(`Budget ${id} not found`);
  const next = { ...current, ...changes, updatedAt: Date.now() };
  await db.runAsync(
    `UPDATE budgets
     SET category_id = ?, amount_limit_minor = ?, currency = ?, period = ?, start_date = ?, updated_at = ?
     WHERE id = ?`,
    next.categoryId,
    next.amountLimitMinor,
    next.currency,
    next.period,
    next.startDate,
    next.updatedAt,
    id
  );
}

export async function deleteBudget(db: SQLiteDatabase, id: string): Promise<void> {
  const now = Date.now();
  await db.runAsync('UPDATE budgets SET deleted_at = ?, updated_at = ? WHERE id = ?', now, now, id);
}

/** All rows including soft-deleted ones — used for backup export/merge, never for UI lists. */
export async function listAllForBackup(db: SQLiteDatabase): Promise<Budget[]> {
  const rows = await db.getAllAsync<BudgetRow>('SELECT * FROM budgets');
  return rows.map(fromRow);
}

/** Overwrites (or inserts) a budget row exactly as given. Used only when applying a Drive backup. */
export async function upsertBudgetFromBackup(db: SQLiteDatabase, budget: Budget): Promise<void> {
  await db.runAsync(
    `INSERT INTO budgets
      (id, category_id, amount_limit_minor, currency, period, start_date, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       category_id = excluded.category_id,
       amount_limit_minor = excluded.amount_limit_minor,
       currency = excluded.currency,
       period = excluded.period,
       start_date = excluded.start_date,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at`,
    budget.id,
    budget.categoryId,
    budget.amountLimitMinor,
    budget.currency,
    budget.period,
    budget.startDate,
    budget.createdAt,
    budget.updatedAt,
    budget.deletedAt
  );
}
