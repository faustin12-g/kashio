import type { BackupPayload } from '../models/types';

/** 1 = the original format. 2 = adds accounts, transfers, goals, debts, recurring rules and the currency. */
export const BACKUP_SCHEMA_VERSION = 2;

/**
 * Reads and checks a backup file. Backups made before schema 2 simply do not
 * have the newer lists, so those default to empty rather than being rejected.
 */
export function parseBackupPayload(raw: string): BackupPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('The backup file on Drive is not valid JSON. It may be corrupted.');
  }
  const payload = parsed as Partial<BackupPayload> | null;
  if (
    !payload ||
    typeof payload.schemaVersion !== 'number' ||
    !Array.isArray(payload.categories) ||
    !Array.isArray(payload.transactions) ||
    !Array.isArray(payload.budgets)
  ) {
    throw new Error('The backup file on Drive has an unexpected format.');
  }
  if (payload.schemaVersion > BACKUP_SCHEMA_VERSION) {
    throw new Error(
      'This backup was created by a newer version of Kashio. Update the app before restoring it.'
    );
  }
  return {
    ...payload,
    categories: payload.categories,
    transactions: payload.transactions,
    budgets: payload.budgets,
    accounts: payload.accounts ?? [],
    transfers: payload.transfers ?? [],
    goals: payload.goals ?? [],
    goalContributions: payload.goalContributions ?? [],
    debts: payload.debts ?? [],
    debtPayments: payload.debtPayments ?? [],
    recurring: payload.recurring ?? [],
  } as BackupPayload;
}

