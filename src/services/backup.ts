import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import type { BackupPayload } from '../models/types';
import { listCategories, upsertCategoryFromBackup } from '../repositories/categoriesRepository';
import {
  countTransactions,
  listAllForBackup as listAllTransactions,
  upsertTransactionFromBackup,
} from '../repositories/transactionsRepository';
import { listAllForBackup as listAllBudgets, upsertBudgetFromBackup } from '../repositories/budgetsRepository';
import {
  listAllAccountsForBackup,
  listAllTransfersForBackup,
  upsertAccountFromBackup,
  upsertTransferFromBackup,
} from '../repositories/accountsRepository';
import {
  listAllContributionsForBackup,
  listAllGoalsForBackup,
  upsertContributionFromBackup,
  upsertGoalFromBackup,
} from '../repositories/goalsRepository';
import {
  listAllDebtsForBackup,
  listAllPaymentsForBackup,
  upsertDebtFromBackup,
  upsertPaymentFromBackup,
} from '../repositories/debtsRepository';
import { listAllRecurringForBackup, upsertRecurringFromBackup } from '../repositories/recurringRepository';
import { getMeta, setMeta, META_KEYS } from '../repositories/metaRepository';
import { getAccessToken, invalidateAccessToken } from './googleAuth';
import {
  DriveApiError,
  findBackupFile,
  findOrCreateBackupFolder,
  readBackupFile,
  writeBackupFile,
} from './googleDrive';
import { recordsToApplyFromRemote, type Mergeable } from './merge';
import { BACKUP_SCHEMA_VERSION, parseBackupPayload } from './backupFormat';

export async function buildBackupPayload(db: SQLiteDatabase): Promise<BackupPayload> {
  const [
    categories,
    transactions,
    budgets,
    accounts,
    transfers,
    goals,
    goalContributions,
    debts,
    debtPayments,
    recurring,
    currency,
  ] = await Promise.all([
    listCategories(db, { includeArchived: true }),
    listAllTransactions(db),
    listAllBudgets(db),
    listAllAccountsForBackup(db),
    listAllTransfersForBackup(db),
    listAllGoalsForBackup(db),
    listAllContributionsForBackup(db),
    listAllDebtsForBackup(db),
    listAllPaymentsForBackup(db),
    listAllRecurringForBackup(db),
    getMeta(db, META_KEYS.currency),
  ]);

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    deviceName: Platform.OS === 'ios' ? 'iOS device' : 'Android device',
    currency: currency ?? undefined,
    categories,
    transactions,
    budgets,
    accounts,
    transfers,
    goals,
    goalContributions,
    debts,
    debtPayments,
    recurring,
  };
}

export interface DriveOptions {
  /** When false, never show a permission screen: fail quietly instead. Used for automatic backups. */
  interactive?: boolean;
}

/**
 * Runs `work` with a Drive access token. If Google rejects the token (expired,
 * or issued without Drive permission), it discards that token and retries
 * exactly once with a fresh one; a second failure is reported as is.
 */
async function withDriveToken<T>(
  options: DriveOptions,
  work: (accessToken: string) => Promise<T>
): Promise<T> {
  const token = await getAccessToken({ interactive: options.interactive ?? true });
  try {
    return await work(token);
  } catch (error) {
    const retryable = error instanceof DriveApiError && (error.isScopeError || error.status === 401);
    if (!retryable) throw error;
    await invalidateAccessToken(token);
    return work(await getAccessToken({ interactive: options.interactive ?? true }));
  }
}

export function backupToDrive(
  db: SQLiteDatabase,
  options: DriveOptions = {}
): Promise<{ backedUpAt: number }> {
  return withDriveToken(options, (accessToken) => backupWithToken(db, accessToken));
}

async function backupWithToken(db: SQLiteDatabase, accessToken: string): Promise<{ backedUpAt: number }> {
  const cachedFolderId = await getMeta(db, META_KEYS.driveFolderId);
  const folderId = await findOrCreateBackupFolder(accessToken, cachedFolderId);

  const cachedFileId = await getMeta(db, META_KEYS.driveFileId);
  const existingFile = cachedFileId ? { id: cachedFileId } : await findBackupFile(accessToken, folderId);

  const payload = await buildBackupPayload(db);
  const fileId = await writeBackupFile(accessToken, folderId, existingFile?.id ?? null, JSON.stringify(payload));

  const now = Date.now();
  await setMeta(db, META_KEYS.driveFolderId, folderId);
  await setMeta(db, META_KEYS.driveFileId, fileId);
  await setMeta(db, META_KEYS.lastBackupAt, String(now));

  return { backedUpAt: now };
}

export function restoreFromDrive(
  db: SQLiteDatabase,
  options: DriveOptions = {}
): Promise<{ restoredAt: number } | null> {
  return withDriveToken(options, (accessToken) => restoreWithToken(db, accessToken));
}

interface MergePlan<T extends Mergeable> {
  local: T[];
  remote: T[];
  apply: (db: SQLiteDatabase, record: T) => Promise<void>;
}

function plan<T extends Mergeable>(
  local: T[],
  remote: T[] | undefined,
  apply: (db: SQLiteDatabase, record: T) => Promise<void>
): MergePlan<T> {
  return { local, remote: remote ?? [], apply };
}

async function restoreWithToken(
  db: SQLiteDatabase,
  accessToken: string
): Promise<{ restoredAt: number } | null> {
  const cachedFolderId = await getMeta(db, META_KEYS.driveFolderId);
  const folderId = await findOrCreateBackupFolder(accessToken, cachedFolderId);
  await setMeta(db, META_KEYS.driveFolderId, folderId);

  const cachedFileId = await getMeta(db, META_KEYS.driveFileId);
  const remoteFile = cachedFileId ? { id: cachedFileId } : await findBackupFile(accessToken, folderId);
  if (!remoteFile) return null;

  const raw = await readBackupFile(accessToken, remoteFile.id);
  const payload = parseBackupPayload(raw);

  // A phone with no transactions yet is a fresh install: take the currency from the backup.
  const isFreshInstall = (await countTransactions(db)) === 0;

  const [
    categories,
    transactions,
    budgets,
    accounts,
    transfers,
    goals,
    contributions,
    debts,
    payments,
    recurring,
  ] = await Promise.all([
    listCategories(db, { includeArchived: true }),
    listAllTransactions(db),
    listAllBudgets(db),
    listAllAccountsForBackup(db),
    listAllTransfersForBackup(db),
    listAllGoalsForBackup(db),
    listAllContributionsForBackup(db),
    listAllDebtsForBackup(db),
    listAllPaymentsForBackup(db),
    listAllRecurringForBackup(db),
  ]);

  // Categories and accounts first, since everything else can point at them.
  const plans = [
    plan(categories, payload.categories, upsertCategoryFromBackup),
    plan(accounts, payload.accounts, upsertAccountFromBackup),
    plan(transactions, payload.transactions, upsertTransactionFromBackup),
    plan(budgets, payload.budgets, upsertBudgetFromBackup),
    plan(transfers, payload.transfers, upsertTransferFromBackup),
    plan(goals, payload.goals, upsertGoalFromBackup),
    plan(contributions, payload.goalContributions, upsertContributionFromBackup),
    plan(debts, payload.debts, upsertDebtFromBackup),
    plan(payments, payload.debtPayments, upsertPaymentFromBackup),
    plan(recurring, payload.recurring, upsertRecurringFromBackup),
  ];

  await db.withTransactionAsync(async () => {
    for (const step of plans) {
      // The generic parameter differs per step, so the loop treats records as opaque.
      const toApply = recordsToApplyFromRemote(step.local as Mergeable[], step.remote as Mergeable[]);
      for (const record of toApply) {
        await (step.apply as (db: SQLiteDatabase, record: Mergeable) => Promise<void>)(db, record);
      }
    }
    if (isFreshInstall && payload.currency) {
      await setMeta(db, META_KEYS.currency, payload.currency);
    }
  });

  const now = Date.now();
  await setMeta(db, META_KEYS.driveFileId, remoteFile.id);
  await setMeta(db, META_KEYS.lastRestoreAt, String(now));

  return { restoredAt: now };
}
