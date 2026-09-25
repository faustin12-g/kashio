import type { SQLiteDatabase } from 'expo-sqlite';
import type { NewRecurring, Recurring } from '../models/types';
import { upsertRow } from '../db/upsert';
import { generateId } from '../utils/id';

interface RecurringRow {
  id: string;
  type: Recurring['type'];
  amount_minor: number;
  category_id: string | null;
  account_id: string | null;
  note: string;
  frequency: Recurring['frequency'];
  start_date: string;
  end_date: string | null;
  generated_count: number;
  is_active: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

function fromRow(row: RecurringRow): Recurring {
  return {
    id: row.id,
    type: row.type,
    amountMinor: row.amount_minor,
    categoryId: row.category_id,
    accountId: row.account_id,
    note: row.note,
    frequency: row.frequency,
    startDate: row.start_date,
    endDate: row.end_date,
    generatedCount: row.generated_count,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function listRecurring(db: SQLiteDatabase): Promise<Recurring[]> {
  const rows = await db.getAllAsync<RecurringRow>(
    'SELECT * FROM recurring WHERE deleted_at IS NULL ORDER BY created_at DESC'
  );
  return rows.map(fromRow);
}

export async function createRecurring(db: SQLiteDatabase, input: NewRecurring): Promise<Recurring> {
  const now = Date.now();
  const rule: Recurring = {
    id: generateId(),
    type: input.type,
    amountMinor: input.amountMinor,
    categoryId: input.categoryId,
    accountId: input.accountId,
    note: input.note,
    frequency: input.frequency,
    startDate: input.startDate,
    endDate: input.endDate,
    generatedCount: 0,
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  await db.runAsync(
    `INSERT INTO recurring
      (id, type, amount_minor, category_id, account_id, note, frequency, start_date, end_date, generated_count, is_active, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NULL)`,
    rule.id,
    rule.type,
    rule.amountMinor,
    rule.categoryId,
    rule.accountId,
    rule.note,
    rule.frequency,
    rule.startDate,
    rule.endDate,
    rule.isActive ? 1 : 0,
    rule.createdAt,
    rule.updatedAt
  );
  return rule;
}

export async function updateRecurring(
  db: SQLiteDatabase,
  id: string,
  changes: Partial<NewRecurring>
): Promise<void> {
  const current = await db.getFirstAsync<RecurringRow>(
    'SELECT * FROM recurring WHERE id = ? AND deleted_at IS NULL',
    id
  );
  if (!current) throw new Error(`Recurring rule ${id} not found`);
  const next = { ...fromRow(current), ...changes };
  await db.runAsync(
    `UPDATE recurring SET type = ?, amount_minor = ?, category_id = ?, account_id = ?, note = ?, frequency = ?,
       start_date = ?, end_date = ?, is_active = ?, updated_at = ? WHERE id = ?`,
    next.type,
    next.amountMinor,
    next.categoryId,
    next.accountId,
    next.note,
    next.frequency,
    next.startDate,
    next.endDate,
    next.isActive ? 1 : 0,
    Date.now(),
    id
  );
}

/** Records that occurrences up to `count` have been turned into transactions. */
export async function setGeneratedCount(db: SQLiteDatabase, id: string, count: number): Promise<void> {
  await db.runAsync(
    'UPDATE recurring SET generated_count = ?, updated_at = ? WHERE id = ?',
    count,
    Date.now(),
    id
  );
}

export async function deleteRecurring(db: SQLiteDatabase, id: string): Promise<void> {
  const now = Date.now();
  await db.runAsync('UPDATE recurring SET deleted_at = ?, updated_at = ? WHERE id = ?', now, now, id);
}

export async function listAllRecurringForBackup(db: SQLiteDatabase): Promise<Recurring[]> {
  const rows = await db.getAllAsync<RecurringRow>('SELECT * FROM recurring');
  return rows.map(fromRow);
}

export async function upsertRecurringFromBackup(db: SQLiteDatabase, rule: Recurring): Promise<void> {
  await upsertRow(db, 'recurring', {
    id: rule.id,
    type: rule.type,
    amount_minor: rule.amountMinor,
    category_id: rule.categoryId,
    account_id: rule.accountId,
    note: rule.note,
    frequency: rule.frequency,
    start_date: rule.startDate,
    end_date: rule.endDate,
    generated_count: rule.generatedCount,
    is_active: rule.isActive ? 1 : 0,
    created_at: rule.createdAt,
    updated_at: rule.updatedAt,
    deleted_at: rule.deletedAt,
  });
}
