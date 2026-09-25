import type { SQLiteDatabase } from 'expo-sqlite';
import { useAccountsStore } from './accountsStore';
import { useBudgetsStore } from './budgetsStore';
import { useCategoriesStore } from './categoriesStore';
import { useDebtsStore } from './debtsStore';
import { useGoalsStore } from './goalsStore';
import { useRecurringStore } from './recurringStore';
import { useSettingsStore } from './settingsStore';
import { useTransactionsStore } from './transactionsStore';

/**
 * Re-reads everything from the database into the in-memory stores. Used after
 * a restore, which changes the database underneath the screens.
 */
export async function reloadAllStores(db: SQLiteDatabase): Promise<void> {
  await Promise.all([
    useSettingsStore.getState().load(db),
    useCategoriesStore.getState().load(db),
    useTransactionsStore.getState().load(db),
    useBudgetsStore.getState().load(db),
    useAccountsStore.getState().load(db),
    useGoalsStore.getState().load(db),
    useDebtsStore.getState().load(db),
    useRecurringStore.getState().load(db),
  ]);
}
