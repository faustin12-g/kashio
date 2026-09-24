import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Ordered, additive schema migrations. Each entry's index+1 is its target
 * `PRAGMA user_version`. Never edit a migration once it has shipped —
 * append a new one instead, so upgrades on real devices stay correct.
 */
const MIGRATIONS: string[] = [
  // v1: initial schema
  `
  PRAGMA foreign_keys = ON;

  CREATE TABLE categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE transactions (
    id TEXT PRIMARY KEY NOT NULL,
    amount_minor INTEGER NOT NULL,
    currency TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    note TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX idx_transactions_date ON transactions(date);
  CREATE INDEX idx_transactions_category ON transactions(category_id);
  CREATE INDEX idx_transactions_deleted ON transactions(deleted_at);

  CREATE TABLE budgets (
    id TEXT PRIMARY KEY NOT NULL,
    category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
    amount_limit_minor INTEGER NOT NULL,
    currency TEXT NOT NULL,
    period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly')),
    start_date TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX idx_budgets_category ON budgets(category_id);

  CREATE TABLE meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT
  );
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

/**
 * Brings `db` from whatever `user_version` it's currently at up to
 * `SCHEMA_VERSION`, running each pending migration inside its own
 * transaction. Safe to call on every app start.
 */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion >= SCHEMA_VERSION) return;

  for (let version = currentVersion; version < SCHEMA_VERSION; version++) {
    const statements = MIGRATIONS[version];
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(statements);
    });
    await db.execAsync(`PRAGMA user_version = ${version + 1}`);
  }
}
