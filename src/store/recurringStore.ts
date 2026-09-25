import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { NewRecurring, Recurring } from '../models/types';
import * as recurringRepository from '../repositories/recurringRepository';
import { getMeta, META_KEYS } from '../repositories/metaRepository';
import { generateDueRecurring } from '../services/recurring';
import { checkBudgetAlerts } from '../services/budgetAlertRunner';
import { todayIso } from '../utils/date';
import { useTransactionsStore } from './transactionsStore';

interface RecurringState {
  rules: Recurring[];
  isLoaded: boolean;
  load: (db: SQLiteDatabase) => Promise<void>;
  create: (db: SQLiteDatabase, input: NewRecurring) => Promise<void>;
  update: (db: SQLiteDatabase, id: string, changes: Partial<NewRecurring>) => Promise<void>;
  remove: (db: SQLiteDatabase, id: string) => Promise<void>;
  /** Adds every recurring transaction that has come due. Returns how many were added. */
  generateDue: (db: SQLiteDatabase) => Promise<number>;
}

export const useRecurringStore = create<RecurringState>((set, get) => ({
  rules: [],
  isLoaded: false,

  load: async (db) => {
    set({ rules: await recurringRepository.listRecurring(db), isLoaded: true });
  },

  create: async (db, input) => {
    await recurringRepository.createRecurring(db, input);
    await get().generateDue(db);
  },

  update: async (db, id, changes) => {
    await recurringRepository.updateRecurring(db, id, changes);
    await get().generateDue(db);
  },

  remove: async (db, id) => {
    await recurringRepository.deleteRecurring(db, id);
    await get().load(db);
  },

  generateDue: async (db) => {
    const currency = (await getMeta(db, META_KEYS.currency)) ?? 'USD';
    const created = await generateDueRecurring(db, todayIso(), currency);
    await get().load(db);
    if (created > 0) {
      await useTransactionsStore.getState().load(db);
      void checkBudgetAlerts(db);
    }
    return created;
  },
}));
