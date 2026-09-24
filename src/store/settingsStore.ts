import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getMeta, setMeta, META_KEYS } from '../repositories/metaRepository';

export const DEFAULT_CURRENCY = 'USD';

interface SettingsState {
  currency: string;
  isLoaded: boolean;
  load: (db: SQLiteDatabase) => Promise<void>;
  setCurrency: (db: SQLiteDatabase, currency: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  currency: DEFAULT_CURRENCY,
  isLoaded: false,

  load: async (db) => {
    const stored = await getMeta(db, META_KEYS.currency);
    set({ currency: stored ?? DEFAULT_CURRENCY, isLoaded: true });
  },

  setCurrency: async (db, currency) => {
    await setMeta(db, META_KEYS.currency, currency);
    set({ currency });
  },
}));
