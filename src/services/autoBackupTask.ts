import * as BackgroundTask from 'expo-background-task';
import * as SQLite from 'expo-sqlite';
import * as TaskManager from 'expo-task-manager';
import { DATABASE_NAME } from '../db/client';
import { AUTO_BACKUP_TASK, runAutoBackupIfDue } from './autoBackup';

/**
 * The background job itself. This file must be imported once when the app
 * starts (the root layout does it), because Android can wake the app just to
 * run this, and the task has to be defined before that happens.
 */
TaskManager.defineTask(AUTO_BACKUP_TASK, async () => {
  try {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    const outcome = await runAutoBackupIfDue(db);
    return outcome === 'failed' ? BackgroundTask.BackgroundTaskResult.Failed : BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});
