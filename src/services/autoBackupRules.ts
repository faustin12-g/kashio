/** Automatic backups run about once a day. */
export const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** True when there has never been a backup, or the last one is at least `intervalMs` old. */
export function isBackupDue(
  lastBackupAt: number | null,
  nowMs: number,
  intervalMs: number = BACKUP_INTERVAL_MS
): boolean {
  if (lastBackupAt === null) return true;
  return nowMs - lastBackupAt >= intervalMs;
}

export interface AutoBackupConditions {
  enabled: boolean;
  signedIn: boolean;
  lastBackupAt: number | null;
  nowMs: number;
  wifiOnly: boolean;
  /** Whether the phone is online at all. */
  connected: boolean;
  /** Whether the current connection is Wi-Fi. */
  onWifi: boolean;
}

export type AutoBackupDecision = 'run' | 'disabled' | 'not_signed_in' | 'not_due' | 'offline' | 'needs_wifi';

/**
 * Decides whether an automatic backup should happen right now, and if not,
 * why not. Kept separate from the code that runs it so every rule can be
 * tested: it must never use mobile data when the user chose Wi-Fi only.
 */
export function decideAutoBackup(conditions: AutoBackupConditions): AutoBackupDecision {
  if (!conditions.enabled) return 'disabled';
  if (!conditions.signedIn) return 'not_signed_in';
  if (!isBackupDue(conditions.lastBackupAt, conditions.nowMs)) return 'not_due';
  if (!conditions.connected) return 'offline';
  if (conditions.wifiOnly && !conditions.onWifi) return 'needs_wifi';
  return 'run';
}
