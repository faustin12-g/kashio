import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { DriveAccount, SyncStatus } from '../models/types';
import * as googleAuth from '../services/googleAuth';
import { backupToDrive, restoreFromDrive } from '../services/backup';
import { getMeta, META_KEYS } from '../repositories/metaRepository';
import { reloadAllStores } from './reloadAll';

interface SyncState {
  status: SyncStatus;
  account: DriveAccount | null;
  lastBackupAt: number | null;
  lastRestoreAt: number | null;
  lastError: string | null;
  /** Restores a previous Google session (if any) without showing sign-in UI. Call once on app start. */
  init: (db: SQLiteDatabase) => Promise<void>;
  signIn: (db: SQLiteDatabase) => Promise<void>;
  signOut: () => Promise<void>;
  backup: (db: SQLiteDatabase) => Promise<void>;
  /** Returns the restore result (null if there was nothing on Drive yet) so callers can tailor their message. */
  restore: (db: SQLiteDatabase) => Promise<{ restoredAt: number } | null>;
}

async function loadTimestamps(db: SQLiteDatabase) {
  const [lastBackupRaw, lastRestoreRaw] = await Promise.all([
    getMeta(db, META_KEYS.lastBackupAt),
    getMeta(db, META_KEYS.lastRestoreAt),
  ]);
  return {
    lastBackupAt: lastBackupRaw ? Number(lastBackupRaw) : null,
    lastRestoreAt: lastRestoreRaw ? Number(lastRestoreRaw) : null,
  };
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: 'signed_out',
  account: null,
  lastBackupAt: null,
  lastRestoreAt: null,
  lastError: null,

  init: async (db) => {
    const timestamps = await loadTimestamps(db);
    const account = await googleAuth.restoreSession();
    set({ account, status: account ? 'idle' : 'signed_out', ...timestamps });
  },

  signIn: async (db) => {
    set({ lastError: null });
    try {
      const account = await googleAuth.signIn();
      const timestamps = await loadTimestamps(db);
      set({ account, status: 'idle', ...timestamps });
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : 'Sign-in failed.' });
      throw error;
    }
  },

  signOut: async () => {
    await googleAuth.signOut();
    set({ account: null, status: 'signed_out', lastError: null });
  },

  backup: async (db) => {
    set({ status: 'backing_up', lastError: null });
    try {
      const { backedUpAt } = await backupToDrive(db);
      set({ status: 'idle', lastBackupAt: backedUpAt });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Backup failed.';
      set({ status: 'error', lastError: message });
      throw error;
    }
  },

  restore: async (db) => {
    set({ status: 'restoring', lastError: null });
    try {
      const result = await restoreFromDrive(db);
      if (result) await reloadAllStores(db);
      set({ status: 'idle', lastRestoreAt: result?.restoredAt ?? get().lastRestoreAt });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Restore failed.';
      set({ status: 'error', lastError: message });
      throw error;
    }
  },
}));
