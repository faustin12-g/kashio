import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { NewRecurring, Recurring } from '../models/types';
import * as recurringRepository from '../repositories/recurringRepository';
import { listCategories } from '../repositories/categoriesRepository';
import { getMeta, META_KEYS } from '../repositories/metaRepository';
import { dueOccurrences, recordOccurrence, skipOccurrence, type DueOccurrence } from '../services/recurring';
import { syncRecurringReminders } from '../services/recurringReminders';
import { checkBudgetAlerts } from '../services/budgetAlertRunner';
import { categoryDisplayName } from '../i18n';
import { currentTranslation } from '../i18n/useTranslation';
import { todayIso } from '../utils/date';
import { useAccountsStore } from './accountsStore';
import { useTransactionsStore } from './transactionsStore';

export interface DueItem {
  rule: Recurring;
  /** Every occurrence waiting for an answer, oldest first. */
  due: DueOccurrence[];
}

interface RecurringState {
  rules: Recurring[];
  /** Items that have come due and are waiting to be recorded or skipped. */
  dueItems: DueItem[];
  isLoaded: boolean;
  /** Reloads the items and re-arms their reminder notifications. */
  load: (db: SQLiteDatabase) => Promise<void>;
  create: (db: SQLiteDatabase, input: NewRecurring) => Promise<void>;
  update: (db: SQLiteDatabase, id: string, changes: Partial<NewRecurring>) => Promise<void>;
  remove: (db: SQLiteDatabase, id: string) => Promise<void>;
  /** Records the oldest waiting occurrence of an item as a real transaction. */
  record: (db: SQLiteDatabase, ruleId: string) => Promise<void>;
  /** Dismisses the oldest waiting occurrence without recording it. */
  skip: (db: SQLiteDatabase, ruleId: string) => Promise<void>;
}

export const useRecurringStore = create<RecurringState>((set, get) => ({
  rules: [],
  dueItems: [],
  isLoaded: false,

  load: async (db) => {
    const rules = await recurringRepository.listRecurring(db);
    const today = todayIso();
    const dueItems = rules
      .map((rule) => ({ rule, due: dueOccurrences(rule, today) }))
      .filter((item) => item.due.length > 0);
    set({ rules, dueItems, isLoaded: true });

    const [currency, categories] = await Promise.all([
      getMeta(db, META_KEYS.currency),
      listCategories(db, { includeArchived: true }),
    ]);
    const { t } = currentTranslation();
    void syncRecurringReminders(rules, currency ?? 'USD', (categoryId) => {
      const category = categories.find((entry) => entry.id === categoryId);
      return category ? categoryDisplayName(category.name, t) : t('tx.uncategorized');
    });
  },

  create: async (db, input) => {
    await recurringRepository.createRecurring(db, input);
    await get().load(db);
  },

  update: async (db, id, changes) => {
    await recurringRepository.updateRecurring(db, id, changes);
    await get().load(db);
  },

  remove: async (db, id) => {
    await recurringRepository.deleteRecurring(db, id);
    await get().load(db);
  },

  record: async (db, ruleId) => {
    const item = get().dueItems.find((entry) => entry.rule.id === ruleId);
    if (!item) return;
    const currency = (await getMeta(db, META_KEYS.currency)) ?? 'USD';
    await recordOccurrence(db, item.rule, item.due[0], currency);
    await get().load(db);
    void useTransactionsStore.getState().load(db);
    void useAccountsStore.getState().load(db);
    void checkBudgetAlerts(db);
  },

  skip: async (db, ruleId) => {
    const item = get().dueItems.find((entry) => entry.rule.id === ruleId);
    if (!item) return;
    await skipOccurrence(db, item.rule, item.due[0]);
    await get().load(db);
  },
}));
