import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Small key/value store for app-level state that isn't a domain record:
 * the currently selected currency, last backup timestamp, the Drive file
 * id for the backup, etc.
 */
export async function getMeta(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setMeta(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', key, value);
}

export async function deleteMeta(db: SQLiteDatabase, key: string): Promise<void> {
  await db.runAsync('DELETE FROM meta WHERE key = ?', key);
}

export const META_KEYS = {
  currency: 'default_currency',
  themeMode: 'theme_mode',
  language: 'language',
  reminderEnabled: 'reminder_enabled',
  reminderTime: 'reminder_time',
  appLockEnabled: 'app_lock_enabled',
  lockTimeout: 'app_lock_timeout_ms',
  autoBackupEnabled: 'auto_backup_enabled',
  autoBackupWifiOnly: 'auto_backup_wifi_only',
  onboardingDone: 'onboarding_done',
  driveFileId: 'drive_backup_file_id',
  driveFolderId: 'drive_backup_folder_id',
  lastBackupAt: 'last_backup_at',
  lastRestoreAt: 'last_restore_at',
} as const;
