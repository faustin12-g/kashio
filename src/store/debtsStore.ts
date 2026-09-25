import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import { parseISO, setHours } from 'date-fns';
import type { Debt, NewDebt, NewDebtPayment } from '../models/types';
import * as debtsRepository from '../repositories/debtsRepository';
import type { DebtWithPayments } from '../repositories/debtsRepository';
import { getMeta, META_KEYS } from '../repositories/metaRepository';
import { currentTranslation } from '../i18n/useTranslation';
import { cancelDebtReminder, scheduleDebtReminder } from '../services/notifications';
import { debtRemaining } from '../services/goalsAndDebts';
import { formatMoney } from '../utils/money';

/** The hour of the due date at which the reminder appears. */
const REMINDER_HOUR = 9;

/**
 * Keeps the phone's scheduled reminder in step with a debt: one at 9am on the
 * due date while money is still outstanding, none once it is settled or has
 * no due date. Never throws, so a notification problem cannot block saving.
 */
async function refreshReminder(db: SQLiteDatabase, entry: DebtWithPayments): Promise<void> {
  try {
    const { debt, paidMinor } = entry;
    const remaining = debtRemaining(debt.amountMinor, paidMinor);
    if (!debt.dueDate || remaining <= 0) {
      await cancelDebtReminder(debt.id);
      return;
    }
    const currency = (await getMeta(db, META_KEYS.currency)) ?? 'USD';
    const { t } = currentTranslation();
    const params = { person: debt.person, amount: formatMoney(remaining, currency) };
    await scheduleDebtReminder(
      debt.id,
      setHours(parseISO(debt.dueDate), REMINDER_HOUR),
      t('debt.reminderTitle'),
      debt.direction === 'owed_to_me' ? t('debt.reminderOwedToMe', params) : t('debt.reminderIOwe', params)
    );
  } catch (error) {
    console.warn('Could not update the debt reminder', error);
  }
}

interface DebtsState {
  debts: DebtWithPayments[];
  isLoaded: boolean;
  load: (db: SQLiteDatabase) => Promise<void>;
  create: (db: SQLiteDatabase, input: NewDebt) => Promise<Debt>;
  update: (db: SQLiteDatabase, id: string, changes: Partial<NewDebt>) => Promise<void>;
  remove: (db: SQLiteDatabase, id: string) => Promise<void>;
  addPayment: (db: SQLiteDatabase, input: NewDebtPayment) => Promise<void>;
  removePayment: (db: SQLiteDatabase, id: string) => Promise<void>;
}

export const useDebtsStore = create<DebtsState>((set, get) => {
  const reload = async (db: SQLiteDatabase, changedDebtId?: string) => {
    const debts = await debtsRepository.listDebts(db);
    set({ debts, isLoaded: true });
    const changed = changedDebtId ? debts.find((entry) => entry.debt.id === changedDebtId) : undefined;
    if (changed) await refreshReminder(db, changed);
  };

  return {
    debts: [],
    isLoaded: false,

    load: async (db) => reload(db),

    create: async (db, input) => {
      const debt = await debtsRepository.createDebt(db, input);
      await reload(db, debt.id);
      return debt;
    },

    update: async (db, id, changes) => {
      await debtsRepository.updateDebt(db, id, changes);
      await reload(db, id);
    },

    remove: async (db, id) => {
      await debtsRepository.deleteDebt(db, id);
      await cancelDebtReminder(id).catch(() => undefined);
      await reload(db);
    },

    addPayment: async (db, input) => {
      await debtsRepository.addPayment(db, input);
      await reload(db, input.debtId);
    },

    removePayment: async (db, id) => {
      // The payment's debt is not known here, so refresh every reminder afterwards.
      await debtsRepository.deletePayment(db, id);
      await reload(db);
      for (const entry of get().debts) await refreshReminder(db, entry);
    },
  };
});
