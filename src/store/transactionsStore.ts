import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { NewTransaction, Transaction } from '../models/types';
import * as transactionsRepository from '../repositories/transactionsRepository';
import type { TransactionFilter } from '../repositories/transactionsRepository';

interface TransactionsState {
  transactions: Transaction[];
  filter: TransactionFilter;
  isLoaded: boolean;
  load: (db: SQLiteDatabase, filter?: TransactionFilter) => Promise<void>;
  create: (db: SQLiteDatabase, input: NewTransaction) => Promise<void>;
  update: (db: SQLiteDatabase, id: string, changes: Partial<NewTransaction>) => Promise<void>;
  remove: (db: SQLiteDatabase, id: string) => Promise<void>;
}

export const useTransactionsStore = create<TransactionsState>((set, get) => ({
  transactions: [],
  filter: {},
  isLoaded: false,

  load: async (db, filter = get().filter) => {
    const transactions = await transactionsRepository.listTransactions(db, filter);
    set({ transactions, filter, isLoaded: true });
  },

  create: async (db, input) => {
    await transactionsRepository.createTransaction(db, input);
    await get().load(db);
  },

  update: async (db, id, changes) => {
    await transactionsRepository.updateTransaction(db, id, changes);
    await get().load(db);
  },

  remove: async (db, id) => {
    await transactionsRepository.deleteTransaction(db, id);
    await get().load(db);
  },
}));
