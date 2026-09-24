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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export interface TransactionFilter {
  from?: string; // inclusive ISO date
  to?: string; // inclusive ISO date
  categoryId?: string;
  type?: 'expense' | 'income';
}

function buildWhere(filter: TransactionFilter): { clause: string; params: SQLiteBindValue[] } {
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
  if (filter.type) {
    clauses.push('type = ?');
    params.push(filter.type);
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

export async function createTransaction(
  db: SQLiteDatabase,
  input: NewTransaction
): Promise<Transaction> {
  const now = Date.now();
  const transaction: Transaction = {
    id: generateId(),
    ...input,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  await db.runAsync(
    `INSERT INTO transactions
      (id, amount_minor, currency, type, category_id, note, date, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    transaction.id,
    transaction.amountMinor,
    transaction.currency,
    transaction.type,
    transaction.categoryId,
    transaction.note,
    transaction.date,
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
  const next = { ...current, ...changes, updatedAt: Date.now() };
  await db.runAsync(
    `UPDATE transactions
     SET amount_minor = ?, currency = ?, type = ?, category_id = ?, note = ?, date = ?, updated_at = ?
     WHERE id = ?`,
    next.amountMinor,
    next.currency,
    next.type,
    next.categoryId,
    next.note,
    next.date,
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
      (id, amount_minor, currency, type, category_id, note, date, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       amount_minor = excluded.amount_minor,
       currency = excluded.currency,
       type = excluded.type,
       category_id = excluded.category_id,
       note = excluded.note,
       date = excluded.date,
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
    transaction.createdAt,
    transaction.updatedAt,
    transaction.deletedAt
  );
}

export async function sumTotal(db: SQLiteDatabase, filter: TransactionFilter): Promise<number> {
  const { clause, params } = buildWhere(filter);
  const row = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount_minor) as total FROM transactions WHERE ${clause}`,
    ...params
  );
  return row?.total ?? 0;
}
