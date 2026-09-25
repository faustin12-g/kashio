import * as Network from 'expo-network';
import * as BackgroundTask from 'expo-background-task';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getMeta, META_KEYS } from '../repositories/metaRepository';
import { backupToDrive } from './backup';
import { decideAutoBackup, type AutoBackupDecision } from './autoBackupRules';
import { restoreSession } from './googleAuth';

export const AUTO_BACKUP_TASK = 'kashio-auto-backup';

/**
 * Backs up to Drive if the settings and the situation allow it: turned on,
 * signed in, due, online, and on Wi-Fi when that is required. Never shows any
 * screen and never throws; the result says what happened.
 */
export async function runAutoBackupIfDue(db: SQLiteDatabase): Promise<AutoBackupDecision | 'done' | 'failed'> {
  try {
    const [enabled, wifiOnly, lastBackup] = await Promise.all([
      getMeta(db, META_KEYS.autoBackupEnabled),
      getMeta(db, META_KEYS.autoBackupWifiOnly),
      getMeta(db, META_KEYS.lastBackupAt),
    ]);
    const network = await Network.getNetworkStateAsync();

    const account = await restoreSession();
    const decision = decideAutoBackup({
      enabled: enabled === '1',
      signedIn: account !== null,
      lastBackupAt: lastBackup ? Number(lastBackup) : null,
      nowMs: Date.now(),
      wifiOnly: wifiOnly === null ? true : wifiOnly === '1',
      connected: Boolean(network.isConnected && network.isInternetReachable !== false),
      onWifi: network.type === Network.NetworkStateType.WIFI,
    });
    if (decision !== 'run') return decision;

    await backupToDrive(db, { interactive: false });
    return 'done';
  } catch (error) {
    console.warn('Automatic backup did not run', error);
    return 'failed';
  }
}

/** Asks Android to run the automatic backup roughly twice a day when conditions allow. */
export async function registerAutoBackupTask(): Promise<void> {
  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
  await BackgroundTask.registerTaskAsync(AUTO_BACKUP_TASK, { minimumInterval: 12 * 60 });
}

export async function unregisterAutoBackupTask(): Promise<void> {
  await BackgroundTask.unregisterTaskAsync(AUTO_BACKUP_TASK).catch(() => undefined);
}
