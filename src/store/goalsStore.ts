import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Goal, NewGoal, NewGoalContribution } from '../models/types';
import * as goalsRepository from '../repositories/goalsRepository';
import type { GoalWithProgress } from '../repositories/goalsRepository';

interface GoalsState {
  goals: GoalWithProgress[];
  isLoaded: boolean;
  load: (db: SQLiteDatabase) => Promise<void>;
  create: (db: SQLiteDatabase, input: NewGoal) => Promise<Goal>;
  update: (db: SQLiteDatabase, id: string, changes: Partial<NewGoal>) => Promise<void>;
  remove: (db: SQLiteDatabase, id: string) => Promise<void>;
  addContribution: (db: SQLiteDatabase, input: NewGoalContribution) => Promise<void>;
  removeContribution: (db: SQLiteDatabase, id: string) => Promise<void>;
}

export const useGoalsStore = create<GoalsState>((set, get) => ({
  goals: [],
  isLoaded: false,

  load: async (db) => {
    set({ goals: await goalsRepository.listGoals(db), isLoaded: true });
  },

  create: async (db, input) => {
    const goal = await goalsRepository.createGoal(db, input);
    await get().load(db);
    return goal;
  },

  update: async (db, id, changes) => {
    await goalsRepository.updateGoal(db, id, changes);
    await get().load(db);
  },

  remove: async (db, id) => {
    await goalsRepository.deleteGoal(db, id);
    await get().load(db);
  },

  addContribution: async (db, input) => {
    await goalsRepository.addContribution(db, input);
    await get().load(db);
  },

  removeContribution: async (db, id) => {
    await goalsRepository.deleteContribution(db, id);
    await get().load(db);
  },
}));
