import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import type { BackupPayload } from '../models/types';
import { listCategories, upsertCategoryFromBackup } from '../repositories/categoriesRepository';
import {
  listAllForBackup as listAllTransactions,
  upsertTransactionFromBackup,
} from '../repositories/transactionsRepository';
import { listAllForBackup as listAllBudgets, upsertBudgetFromBackup } from '../repositories/budgetsRepository';
import { getMeta, setMeta, META_KEYS } from '../repositories/metaRepository';
import { getAccessToken } from './googleAuth';
import {
  findBackupFile,
  findOrCreateBackupFolder,
  readBackupFile,
  writeBackupFile,
} from './googleDrive';
import { recordsToApplyFromRemote } from './merge';

const SCHEMA_VERSION = 1;

export async function buildBackupPayload(db: SQLiteDatabase): Promise<BackupPayload> {
  const [categories, transactions, budgets] = await Promise.all([
    listCategories(db, { includeArchived: true }),
    listAllTransactions(db),
    listAllBudgets(db),
  ]);

  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    deviceName: Platform.OS === 'ios' ? 'iOS device' : 'Android device',
    categories,
    transactions,
    budgets,
  };
}

function parseBackupPayload(raw: string): BackupPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('The backup file on Drive is not valid JSON. It may be corrupted.');
  }
  const payload = parsed as Partial<BackupPayload>;
  if (
    !payload ||
    typeof payload.schemaVersion !== 'number' ||
    !Array.isArray(payload.categories) ||
    !Array.isArray(payload.transactions) ||
    !Array.isArray(payload.budgets)
  ) {
    throw new Error('The backup file on Drive has an unexpected format.');
  }
  if (payload.schemaVersion > SCHEMA_VERSION) {
    throw new Error(
      'This backup was created by a newer version of Buget. Update the app before restoring it.'
    );
  }
  return payload as BackupPayload;
}

/** Uploads the current local database to Drive as a single JSON file, creating it on first run. */
export async function backupToDrive(db: SQLiteDatabase): Promise<{ backedUpAt: number }> {
  const accessToken = await getAccessToken();

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

/**
 * Downloads the Drive backup (if one exists) and merges it into the local
 * database using last-write-wins per record — see `services/merge.ts`.
 * Returns null if there is nothing on Drive yet (e.g. first run on a new
 * device before any backup has ever been made).
 */
export async function restoreFromDrive(db: SQLiteDatabase): Promise<{ restoredAt: number } | null> {
  const accessToken = await getAccessToken();

  const cachedFolderId = await getMeta(db, META_KEYS.driveFolderId);
  const folderId = await findOrCreateBackupFolder(accessToken, cachedFolderId);
  await setMeta(db, META_KEYS.driveFolderId, folderId);

  const cachedFileId = await getMeta(db, META_KEYS.driveFileId);
  const remoteFile = cachedFileId ? { id: cachedFileId } : await findBackupFile(accessToken, folderId);
  if (!remoteFile) return null;

  const raw = await readBackupFile(accessToken, remoteFile.id);
  const payload = parseBackupPayload(raw);

  const [localCategories, localTransactions, localBudgets] = await Promise.all([
    listCategories(db, { includeArchived: true }),
    listAllTransactions(db),
    listAllBudgets(db),
  ]);

  const categoriesToApply = recordsToApplyFromRemote(localCategories, payload.categories);
  const transactionsToApply = recordsToApplyFromRemote(localTransactions, payload.transactions);
  const budgetsToApply = recordsToApplyFromRemote(localBudgets, payload.budgets);

  await db.withTransactionAsync(async () => {
    // Categories first: transactions/budgets may reference category ids
    // that only just arrived from the backup.
    for (const category of categoriesToApply) {
      await upsertCategoryFromBackup(db, category);
    }
    for (const transaction of transactionsToApply) {
      await upsertTransactionFromBackup(db, transaction);
    }
    for (const budget of budgetsToApply) {
      await upsertBudgetFromBackup(db, budget);
    }
  });

  const now = Date.now();
  await setMeta(db, META_KEYS.driveFileId, remoteFile.id);
  await setMeta(db, META_KEYS.lastRestoreAt, String(now));

  return { restoredAt: now };
}
