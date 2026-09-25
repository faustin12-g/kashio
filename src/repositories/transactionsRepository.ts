import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';
import type { NewTransaction, Transaction } from '../models/types';
import { generateId } from '../utils/id';

interface TransactionRow {
  id: string;
  amount_minor: number;
  currency: string;
  type: 'expense' | 'income';
  category_id: string | null;
  note: string;
  date: string;
  account_id: string | null;
  recurring_id: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

function fromRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    amountMinor: row.amount_minor,
    currency: row.currency,
    type: row.type,
    categoryId: row.category_id,
    note: row.note,
    date: row.date,
    accountId: row.account_id,
    recurringId: row.recurring_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export interface TransactionFilter {
  from?: string; // inclusive ISO date
  to?: string; // inclusive ISO date
  categoryId?: string;
  accountId?: string;
  type?: 'expense' | 'income';
  /** Matches the note or the category name, ignoring case. */
  search?: string;
  minMinor?: number;
  maxMinor?: number;
}

/** Escapes % and _ so a search for "50%" matches the text "50%" and not "50 anything". */
function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

/** Turns a filter into the WHERE clause and its bound values. Exported so it can be tested. */
export function buildWhere(filter: TransactionFilter): { clause: string; params: SQLiteBindValue[] } {
  const clauses = ['deleted_at IS NULL'];
  const params: SQLiteBindValue[] = [];

  if (filter.from) {
    clauses.push('date >= ?');
    params.push(filter.from);
  }
  if (filter.to) {
    clauses.push('date <= ?');
    params.push(filter.to);
  }
  if (filter.categoryId) {
    clauses.push('category_id = ?');
    params.push(filter.categoryId);
  }
  if (filter.accountId) {
    clauses.push('account_id = ?');
    params.push(filter.accountId);
  }
  if (filter.type) {
    clauses.push('type = ?');
    params.push(filter.type);
  }
  if (filter.minMinor !== undefined) {
    clauses.push('amount_minor >= ?');
    params.push(filter.minMinor);
  }
  if (filter.maxMinor !== undefined) {
    clauses.push('amount_minor <= ?');
    params.push(filter.maxMinor);
  }
  const search = filter.search?.trim();
  if (search) {
    clauses.push(
      "(note LIKE ? ESCAPE '\\' OR category_id IN (SELECT id FROM categories WHERE name LIKE ? ESCAPE '\\'))"
    );
    params.push(likePattern(search), likePattern(search));
  }

  return { clause: clauses.join(' AND '), params };
}

export async function listTransactions(
  db: SQLiteDatabase,
  filter: TransactionFilter = {}
): Promise<Transaction[]> {
  const { clause, params } = buildWhere(filter);
  const rows = await db.getAllAsync<TransactionRow>(
    `SELECT * FROM transactions WHERE ${clause} ORDER BY date DESC, created_at DESC`,
    ...params
  );
  return rows.map(fromRow);
}

export async function getTransaction(db: SQLiteDatabase, id: string): Promise<Transaction | null> {
  const row = await db.getFirstAsync<TransactionRow>(
    'SELECT * FROM transactions WHERE id = ? AND deleted_at IS NULL',
    id
  );
  return row ? fromRow(row) : null;
}

/**
 * Adds a transaction. Pass `options.id` to use a specific id: recurring rules
 * do this so two devices generating the same occurrence produce the same
 * record instead of a duplicate.
 */
export async function createTransaction(
  db: SQLiteDatabase,
  input: NewTransaction,
  options: { id?: string } = {}
): Promise<Transaction> {
  const now = Date.now();
  const transaction: Transaction = {
    id: options.id ?? generateId(),
    amountMinor: input.amountMinor,
    currency: input.currency,
    type: input.type,
    categoryId: input.categoryId,
    note: input.note,
    date: input.date,
    accountId: input.accountId ?? null,
    recurringId: input.recurringId ?? null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  await db.runAsync(
    `INSERT OR IGNORE INTO transactions
      (id, amount_minor, currency, type, category_id, note, date, account_id, recurring_id, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    transaction.id,
    transaction.amountMinor,
    transaction.currency,
    transaction.type,
    transaction.categoryId,
    transaction.note,
    transaction.date,
    transaction.accountId,
    transaction.recurringId,
    transaction.createdAt,
    transaction.updatedAt
  );
  return transaction;
}

export async function updateTransaction(
  db: SQLiteDatabase,
  id: string,
  changes: Partial<NewTransaction>
): Promise<void> {
  const current = await getTransaction(db, id);
  if (!current) throw new Error(`Transaction ${id} not found`);
  const next = {
    ...current,
    ...changes,
    accountId: changes.accountId === undefined ? current.accountId : changes.accountId,
    updatedAt: Date.now(),
  };
  await db.runAsync(
    `UPDATE transactions
     SET amount_minor = ?, currency = ?, type = ?, category_id = ?, note = ?, date = ?, account_id = ?, updated_at = ?
     WHERE id = ?`,
    next.amountMinor,
    next.currency,
    next.type,
    next.categoryId,
    next.note,
    next.date,
    next.accountId,
    next.updatedAt,
    id
  );
}

/** Soft delete: keeps a tombstone so a Drive restore on another device also removes it there. */
export async function deleteTransaction(db: SQLiteDatabase, id: string): Promise<void> {
  const now = Date.now();
  await db.runAsync('UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?', now, now, id);
}

export interface CategoryTotal {
  categoryId: string | null;
  totalMinor: number;
}

/** Sum of expenses (or income) per category within an inclusive date range. */
export async function sumByCategory(
  db: SQLiteDatabase,
  filter: TransactionFilter
): Promise<CategoryTotal[]> {
  const { clause, params } = buildWhere(filter);
  const rows = await db.getAllAsync<{ category_id: string | null; total: number }>(
    `SELECT category_id, SUM(amount_minor) as total FROM transactions
     WHERE ${clause} GROUP BY category_id`,
    ...params
  );
  return rows.map((row) => ({ categoryId: row.category_id, totalMinor: row.total }));
}

export async function sumTotal(db: SQLiteDatabase, filter: TransactionFilter): Promise<number> {
  const { clause, params } = buildWhere(filter);
  const row = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount_minor) as total FROM transactions WHERE ${clause}`,
    ...params
  );
  return row?.total ?? 0;
}

/** Income and spending totals for whatever the filter matches. */
export async function sumsByType(
  db: SQLiteDatabase,
  filter: TransactionFilter
): Promise<{ incomeMinor: number; expenseMinor: number }> {
  const { clause, params } = buildWhere({ ...filter, type: undefined });
  const rows = await db.getAllAsync<{ type: 'expense' | 'income'; total: number }>(
    `SELECT type, SUM(amount_minor) as total FROM transactions WHERE ${clause} GROUP BY type`,
    ...params
  );
  const totals = { incomeMinor: 0, expenseMinor: 0 };
  for (const row of rows) {
    if (row.type === 'income') totals.incomeMinor = row.total;
    else totals.expenseMinor = row.total;
  }
  return totals;
}

export interface MonthlyTotal {
  month: string; // yyyy-MM
  incomeMinor: number;
  expenseMinor: number;
}

/** Income and spending per calendar month, from `fromMonth` (yyyy-MM) onwards. Months with nothing are omitted. */
export async function monthlyTotals(db: SQLiteDatabase, fromMonth: string): Promise<MonthlyTotal[]> {
  const rows = await db.getAllAsync<{ month: string; type: 'expense' | 'income'; total: number }>(
    `SELECT substr(date, 1, 7) AS month, type, SUM(amount_minor) AS total
     FROM transactions
     WHERE deleted_at IS NULL AND substr(date, 1, 7) >= ?
     GROUP BY month, type
     ORDER BY month`,
    fromMonth
  );
  const byMonth = new Map<string, MonthlyTotal>();
  for (const row of rows) {
    const entry = byMonth.get(row.month) ?? { month: row.month, incomeMinor: 0, expenseMinor: 0 };
    if (row.type === 'income') entry.incomeMinor = row.total;
    else entry.expenseMinor = row.total;
    byMonth.set(row.month, entry);
  }
  return [...byMonth.values()];
}

/** How many times each category has been used, so the most used ones can be offered first. */
export async function categoryUsage(db: SQLiteDatabase): Promise<Record<string, number>> {
  const rows = await db.getAllAsync<{ category_id: string; uses: number }>(
    `SELECT category_id, COUNT(*) AS uses FROM transactions
     WHERE deleted_at IS NULL AND category_id IS NOT NULL GROUP BY category_id`
  );
  return Object.fromEntries(rows.map((row) => [row.category_id, row.uses]));
}

export interface RecentEntry {
  type: 'expense' | 'income';
  categoryId: string | null;
  amountMinor: number;
  note: string;
  accountId: string | null;
}

/** The most recent distinct entries, for a one-tap "add this again". */
export async function recentDistinctEntries(db: SQLiteDatabase, limit: number): Promise<RecentEntry[]> {
  const rows = await db.getAllAsync<{
    type: 'expense' | 'income';
    category_id: string | null;
    amount_minor: number;
    note: string;
    account_id: string | null;
  }>(
    `SELECT type, category_id, amount_minor, note, account_id, MAX(created_at) AS latest
     FROM transactions
     WHERE deleted_at IS NULL AND recurring_id IS NULL
     GROUP BY type, category_id, amount_minor, note, account_id
     ORDER BY latest DESC
     LIMIT ?`,
    limit
  );
  return rows.map((row) => ({
    type: row.type,
    categoryId: row.category_id,
    amountMinor: row.amount_minor,
    note: row.note,
    accountId: row.account_id,
  }));
}

export async function countTransactions(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM transactions WHERE deleted_at IS NULL'
  );
  return row?.total ?? 0;
}

/** All rows including soft-deleted ones — used for backup export/merge, never for UI lists. */
export async function listAllForBackup(db: SQLiteDatabase): Promise<Transaction[]> {
  const rows = await db.getAllAsync<TransactionRow>('SELECT * FROM transactions');
  return rows.map(fromRow);
}

/**
 * Writes a transaction exactly as given (preserving its id and timestamps),
 * overwriting any existing row with the same id. Used only when applying a
 * Drive backup, where the incoming record has already won a last-write-wins
 * comparison against the local row.
 */
export async function upsertTransactionFromBackup(
  db: SQLiteDatabase,
  transaction: Transaction
): Promise<void> {
  await db.runAsync(
    `INSERT INTO transactions
      (id, amount_minor, currency, type, category_id, note, date, account_id, recurring_id, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       amount_minor = excluded.amount_minor,
       currency = excluded.currency,
       type = excluded.type,
       category_id = excluded.category_id,
       note = excluded.note,
       date = excluded.date,
       account_id = excluded.account_id,
       recurring_id = excluded.recurring_id,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at`,
    transaction.id,
    transaction.amountMinor,
    transaction.currency,
    transaction.type,
    transaction.categoryId,
    transaction.note,
    transaction.date,
    transaction.accountId ?? null,
    transaction.recurringId ?? null,
    transaction.createdAt,
    transaction.updatedAt,
    transaction.deletedAt
  );
}
