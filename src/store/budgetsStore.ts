import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { BudgetProgress, NewBudget } from '../models/types';
import * as budgetsRepository from '../repositories/budgetsRepository';
import { listBudgetProgress } from '../services/budgetProgress';
import { checkBudgetAlerts } from '../services/budgetAlertRunner';
import { ensureNotificationPermission } from '../services/notifications';

interface BudgetsState {
  progress: BudgetProgress[];
  isLoaded: boolean;
  load: (db: SQLiteDatabase) => Promise<void>;
  create: (db: SQLiteDatabase, input: NewBudget) => Promise<void>;
  update: (db: SQLiteDatabase, id: string, changes: Partial<NewBudget>) => Promise<void>;
  remove: (db: SQLiteDatabase, id: string) => Promise<void>;
}

export const useBudgetsStore = create<BudgetsState>((set, get) => ({
  progress: [],
  isLoaded: false,

  load: async (db) => {
    const progress = await listBudgetProgress(db);
    set({ progress, isLoaded: true });
  },

  create: async (db, input) => {
    await budgetsRepository.createBudget(db, input);
    await get().load(db);
    // Ask for notification permission now, while the user is setting up a
    // budget and the reason is obvious, then check where spending stands.
    void ensureNotificationPermission()
      .catch(() => false)
      .then(() => checkBudgetAlerts(db));
  },

  update: async (db, id, changes) => {
    await budgetsRepository.updateBudget(db, id, changes);
    await get().load(db);
    void checkBudgetAlerts(db);
  },

  remove: async (db, id) => {
    await budgetsRepository.deleteBudget(db, id);
    await get().load(db);
  },
}));
