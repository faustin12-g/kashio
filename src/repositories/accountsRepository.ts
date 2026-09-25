import type { SQLiteDatabase } from 'expo-sqlite';
import type { Account, NewAccount, NewTransfer, Transfer } from '../models/types';
import { upsertRow } from '../db/upsert';
import { generateId } from '../utils/id';

interface AccountRow {
  id: string;
  name: string;
  type: Account['type'];
  icon: string;
  color: string;
  opening_balance_minor: number;
  is_archived: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

function accountFromRow(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    icon: row.icon,
    color: row.color,
    openingBalanceMinor: row.opening_balance_minor,
    isArchived: row.is_archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function listAccounts(
  db: SQLiteDatabase,
  options: { includeArchived?: boolean } = {}
): Promise<Account[]> {
  const rows = await db.getAllAsync<AccountRow>(
    `SELECT * FROM accounts WHERE deleted_at IS NULL ${options.includeArchived ? '' : 'AND is_archived = 0'}
     ORDER BY created_at`
  );
  return rows.map(accountFromRow);
}

export async function createAccount(db: SQLiteDatabase, input: NewAccount): Promise<Account> {
  const now = Date.now();
  const account: Account = {
    id: generateId(),
    name: input.name,
    type: input.type,
    icon: input.icon,
    color: input.color,
    openingBalanceMinor: input.openingBalanceMinor,
    isArchived: input.isArchived ?? false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  await db.runAsync(
    `INSERT INTO accounts (id, name, type, icon, color, opening_balance_minor, is_archived, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    account.id,
    account.name,
    account.type,
    account.icon,
    account.color,
    account.openingBalanceMinor,
    account.isArchived ? 1 : 0,
    account.createdAt,
    account.updatedAt
  );
  return account;
}

export async function updateAccount(
  db: SQLiteDatabase,
  id: string,
  changes: Partial<Pick<Account, 'name' | 'type' | 'icon' | 'color' | 'openingBalanceMinor' | 'isArchived'>>
): Promise<void> {
  const current = await db.getFirstAsync<AccountRow>(
    'SELECT * FROM accounts WHERE id = ? AND deleted_at IS NULL',
    id
  );
  if (!current) throw new Error(`Account ${id} not found`);
  const next = { ...accountFromRow(current), ...changes };
  await db.runAsync(
    `UPDATE accounts SET name = ?, type = ?, icon = ?, color = ?, opening_balance_minor = ?, is_archived = ?, updated_at = ?
     WHERE id = ?`,
    next.name,
    next.type,
    next.icon,
    next.color,
    next.openingBalanceMinor,
    next.isArchived ? 1 : 0,
    Date.now(),
    id
  );
}

/** Soft delete. Transactions that pointed at it keep their history but lose the account label. */
export async function deleteAccount(db: SQLiteDatabase, id: string): Promise<void> {
  const now = Date.now();
  await db.runAsync('UPDATE accounts SET deleted_at = ?, updated_at = ? WHERE id = ?', now, now, id);
}

/**
 * The current balance of every account: what it started with, plus income and
 * minus spending recorded against it, plus transfers in and minus transfers out.
 */
export async function accountBalances(db: SQLiteDatabase): Promise<Record<string, number>> {
  const rows = await db.getAllAsync<{ id: string; balance: number }>(
    `SELECT a.id AS id,
       a.opening_balance_minor
       + COALESCE((SELECT SUM(CASE t.type WHEN 'income' THEN t.amount_minor ELSE -t.amount_minor END)
                   FROM transactions t WHERE t.account_id = a.id AND t.deleted_at IS NULL), 0)
       + COALESCE((SELECT SUM(x.amount_minor) FROM transfers x WHERE x.to_account_id = a.id AND x.deleted_at IS NULL), 0)
       - COALESCE((SELECT SUM(x.amount_minor) FROM transfers x WHERE x.from_account_id = a.id AND x.deleted_at IS NULL), 0)
       AS balance
     FROM accounts a WHERE a.deleted_at IS NULL`
  );
  return Object.fromEntries(rows.map((row) => [row.id, row.balance]));
}

/** What all accounts held when tracking started. Part of the overall balance. */
export async function totalOpeningBalance(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ total: number | null }>(
    'SELECT SUM(opening_balance_minor) AS total FROM accounts WHERE deleted_at IS NULL'
  );
  return row?.total ?? 0;
}

export async function listAllAccountsForBackup(db: SQLiteDatabase): Promise<Account[]> {
  const rows = await db.getAllAsync<AccountRow>('SELECT * FROM accounts');
  return rows.map(accountFromRow);
}

export async function upsertAccountFromBackup(db: SQLiteDatabase, account: Account): Promise<void> {
  await upsertRow(db, 'accounts', {
    id: account.id,
    name: account.name,
    type: account.type,
    icon: account.icon,
    color: account.color,
    opening_balance_minor: account.openingBalanceMinor,
    is_archived: account.isArchived ? 1 : 0,
    created_at: account.createdAt,
    updated_at: account.updatedAt,
    deleted_at: account.deletedAt,
  });
}

// ---------------- transfers ----------------

interface TransferRow {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount_minor: number;
  note: string;
  date: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

function transferFromRow(row: TransferRow): Transfer {
  return {
    id: row.id,
    fromAccountId: row.from_account_id,
    toAccountId: row.to_account_id,
    amountMinor: row.amount_minor,
    note: row.note,
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function listTransfers(db: SQLiteDatabase): Promise<Transfer[]> {
  const rows = await db.getAllAsync<TransferRow>(
    'SELECT * FROM transfers WHERE deleted_at IS NULL ORDER BY date DESC, created_at DESC'
  );
  return rows.map(transferFromRow);
}

export async function createTransfer(db: SQLiteDatabase, input: NewTransfer): Promise<Transfer> {
  const now = Date.now();
  const transfer: Transfer = { id: generateId(), ...input, createdAt: now, updatedAt: now, deletedAt: null };
  await db.runAsync(
    `INSERT INTO transfers (id, from_account_id, to_account_id, amount_minor, note, date, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    transfer.id,
    transfer.fromAccountId,
    transfer.toAccountId,
    transfer.amountMinor,
    transfer.note,
    transfer.date,
    transfer.createdAt,
    transfer.updatedAt
  );
  return transfer;
}

export async function deleteTransfer(db: SQLiteDatabase, id: string): Promise<void> {
  const now = Date.now();
  await db.runAsync('UPDATE transfers SET deleted_at = ?, updated_at = ? WHERE id = ?', now, now, id);
}

export async function listAllTransfersForBackup(db: SQLiteDatabase): Promise<Transfer[]> {
  const rows = await db.getAllAsync<TransferRow>('SELECT * FROM transfers');
  return rows.map(transferFromRow);
}

export async function upsertTransferFromBackup(db: SQLiteDatabase, transfer: Transfer): Promise<void> {
  await upsertRow(db, 'transfers', {
    id: transfer.id,
    from_account_id: transfer.fromAccountId,
    to_account_id: transfer.toAccountId,
    amount_minor: transfer.amountMinor,
    note: transfer.note,
    date: transfer.date,
    created_at: transfer.createdAt,
    updated_at: transfer.updatedAt,
    deleted_at: transfer.deletedAt,
  });
}
