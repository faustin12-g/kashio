import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Account, NewAccount, NewTransfer, Transfer } from '../models/types';
import * as accountsRepository from '../repositories/accountsRepository';

interface AccountsState {
  accounts: Account[];
  /** Current balance of each account, by id. */
  balances: Record<string, number>;
  transfers: Transfer[];
  isLoaded: boolean;
  load: (db: SQLiteDatabase) => Promise<void>;
  create: (db: SQLiteDatabase, input: NewAccount) => Promise<Account>;
  update: (
    db: SQLiteDatabase,
    id: string,
    changes: Parameters<typeof accountsRepository.updateAccount>[2]
  ) => Promise<void>;
  remove: (db: SQLiteDatabase, id: string) => Promise<void>;
  createTransfer: (db: SQLiteDatabase, input: NewTransfer) => Promise<void>;
  removeTransfer: (db: SQLiteDatabase, id: string) => Promise<void>;
}

export const useAccountsStore = create<AccountsState>((set, get) => ({
  accounts: [],
  balances: {},
  transfers: [],
  isLoaded: false,

  load: async (db) => {
    const [accounts, balances, transfers] = await Promise.all([
      accountsRepository.listAccounts(db),
      accountsRepository.accountBalances(db),
      accountsRepository.listTransfers(db),
    ]);
    set({ accounts, balances, transfers, isLoaded: true });
  },

  create: async (db, input) => {
    const account = await accountsRepository.createAccount(db, input);
    await get().load(db);
    return account;
  },

  update: async (db, id, changes) => {
    await accountsRepository.updateAccount(db, id, changes);
    await get().load(db);
  },

  remove: async (db, id) => {
    await accountsRepository.deleteAccount(db, id);
    await get().load(db);
  },

  createTransfer: async (db, input) => {
    await accountsRepository.createTransfer(db, input);
    await get().load(db);
  },

  removeTransfer: async (db, id) => {
    await accountsRepository.deleteTransfer(db, id);
    await get().load(db);
  },
}));
