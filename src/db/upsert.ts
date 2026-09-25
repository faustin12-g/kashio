import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

/** The tables that can be written to by a backup restore. A fixed list keeps table names out of user data. */
export type UpsertableTable =
  | 'accounts'
  | 'transfers'
  | 'goals'
  | 'goal_contributions'
  | 'debts'
  | 'debt_payments'
  | 'recurring';

const COLUMN_NAME = /^[a-z_]+$/;

/**
 * Builds the SQL for "insert this row, or overwrite the existing row with the
 * same id". Column names come from code, never from user input, and are
 * checked anyway.
 */
export function buildUpsertSql(table: UpsertableTable, columns: string[]): string {
  for (const column of columns) {
    if (!COLUMN_NAME.test(column)) throw new Error(`Invalid column name: ${column}`);
  }
  const placeholders = columns.map(() => '?').join(', ');
  const updates = columns
    .filter((column) => column !== 'id')
    .map((column) => `${column} = excluded.${column}`)
    .join(', ');
  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updates}`;
}

/** Writes a row exactly as given, replacing any existing row with the same id. Used when applying a Drive backup. */
export async function upsertRow(
  db: SQLiteDatabase,
  table: UpsertableTable,
  row: Record<string, SQLiteBindValue>
): Promise<void> {
  const columns = Object.keys(row);
  await db.runAsync(buildUpsertSql(table, columns), ...columns.map((column) => row[column]));
}
