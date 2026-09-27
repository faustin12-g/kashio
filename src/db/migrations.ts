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

  // v2: category icons used to be stored as emoji; they are now icon names.
  // Known emoji map to the closest icon; any other non-plain value falls
  // back to a generic tag. Emoji are written as code point escapes, which
  // the template literal turns into the real character at runtime.
  `
  UPDATE categories SET icon = CASE REPLACE(icon, '\u{FE0F}', '')
    WHEN '\u{1F6D2}' THEN 'cart-outline'
    WHEN '\u{1F68C}' THEN 'bus'
    WHEN '\u{1F3E0}' THEN 'home-outline'
    WHEN '\u{1F4A1}' THEN 'lightbulb-outline'
    WHEN '\u{1F48A}' THEN 'pill'
    WHEN '\u{1F3AC}' THEN 'movie-open-outline'
    WHEN '\u{1F37D}' THEN 'silverware-fork-knife'
    WHEN '\u{1F4E6}' THEN 'package-variant-closed'
    WHEN '\u{1F4B0}' THEN 'cash'
    WHEN '\u{2795}' THEN 'plus-circle-outline'
    ELSE 'tag-outline'
  END
  WHERE icon GLOB '*[^a-z0-9-]*';
  `,

  // v3: accounts, transfers, savings goals, debts and recurring transactions.
  // Purely additive: nothing existing is changed except two new, empty-by-
  // default columns on transactions.
  `
  CREATE TABLE accounts (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'mobile_money', 'savings', 'other')),
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    opening_balance_minor INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );

  CREATE TABLE transfers (
    id TEXT PRIMARY KEY NOT NULL,
    from_account_id TEXT NOT NULL,
    to_account_id TEXT NOT NULL,
    amount_minor INTEGER NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX idx_transfers_date ON transfers(date);

  CREATE TABLE goals (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    target_minor INTEGER NOT NULL,
    deadline TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );

  CREATE TABLE goal_contributions (
    id TEXT PRIMARY KEY NOT NULL,
    goal_id TEXT NOT NULL,
    amount_minor INTEGER NOT NULL,
    date TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX idx_goal_contributions_goal ON goal_contributions(goal_id);

  CREATE TABLE debts (
    id TEXT PRIMARY KEY NOT NULL,
    person TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('owed_to_me', 'i_owe')),
    amount_minor INTEGER NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL,
    due_date TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );

  CREATE TABLE debt_payments (
    id TEXT PRIMARY KEY NOT NULL,
    debt_id TEXT NOT NULL,
    amount_minor INTEGER NOT NULL,
    date TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX idx_debt_payments_debt ON debt_payments(debt_id);

  CREATE TABLE recurring (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
    amount_minor INTEGER NOT NULL,
    category_id TEXT,
    account_id TEXT,
    note TEXT NOT NULL DEFAULT '',
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    start_date TEXT NOT NULL,
    end_date TEXT,
    generated_count INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );

  ALTER TABLE transactions ADD COLUMN account_id TEXT;
  ALTER TABLE transactions ADD COLUMN recurring_id TEXT;
  CREATE INDEX idx_transactions_account ON transactions(account_id);
  `,

  // v4: "money you already had" becomes a real, dated transaction instead of
  // a hidden account field, so it shows up in the transaction list and in
  // whatever period contains its date. Existing accounts are backfilled: one
  // transaction per account with a non-zero opening balance, dated from the
  // account's created_at (a UTC-based approximation — good enough for a
  // one-off historical backfill). Also adds the local notification history.
  `
  ALTER TABLE transactions ADD COLUMN is_opening_balance INTEGER NOT NULL DEFAULT 0;

  INSERT INTO transactions
    (id, amount_minor, currency, type, category_id, note, date, account_id, recurring_id, is_opening_balance, created_at, updated_at, deleted_at)
  SELECT
    'opening:' || a.id,
    ABS(a.opening_balance_minor),
    COALESCE((SELECT value FROM meta WHERE key = 'default_currency'), 'USD'),
    CASE WHEN a.opening_balance_minor < 0 THEN 'expense' ELSE 'income' END,
    NULL,
    '',
    date(a.created_at / 1000, 'unixepoch'),
    a.id,
    NULL,
    1,
    a.created_at,
    a.created_at,
    NULL
  FROM accounts a
  WHERE a.opening_balance_minor != 0;

  UPDATE accounts SET opening_balance_minor = 0 WHERE opening_balance_minor != 0;

  CREATE TABLE notification_log (
    id TEXT PRIMARY KEY NOT NULL,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    route TEXT,
    created_at INTEGER NOT NULL,
    read_at INTEGER
  );
  CREATE INDEX idx_notification_log_created ON notification_log(created_at);
  `,

  // v5: accounts are gone (the app tracks one pool of money, not where it's
  // kept) and a receipt photo can be attached to a transaction. The old
  // accounts/transfers tables and the transactions.account_id /
  // recurring.account_id columns are left in place rather than dropped —
  // SQLite can add columns but not cheaply remove them, and nothing reads
  // these any more, so leaving them is harmless.
  `
  ALTER TABLE transactions ADD COLUMN receipt_uri TEXT;
  UPDATE accounts SET deleted_at = created_at WHERE deleted_at IS NULL;
  UPDATE transfers SET deleted_at = created_at WHERE deleted_at IS NULL;
  `,

  // v6: the budgets table only allowed 'weekly' and 'monthly', so a one-time
  // budget could not be saved. SQLite cannot change a CHECK rule in place, so
  // the table is rebuilt with the wider rule and its rows copied across.
  `
  CREATE TABLE budgets_new (
    id TEXT PRIMARY KEY NOT NULL,
    category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
    amount_limit_minor INTEGER NOT NULL,
    currency TEXT NOT NULL,
    period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'once')),
    start_date TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  INSERT INTO budgets_new SELECT id, category_id, amount_limit_minor, currency, period, start_date, created_at, updated_at, deleted_at FROM budgets;
  DROP TABLE budgets;
  ALTER TABLE budgets_new RENAME TO budgets;
  CREATE INDEX idx_budgets_category ON budgets(category_id);
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
