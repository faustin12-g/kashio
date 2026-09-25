import { useMemo } from 'react';
import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Category, NewCategory } from '../models/types';
import * as categoriesRepository from '../repositories/categoriesRepository';
import { categoryUsage } from '../repositories/transactionsRepository';

interface CategoriesState {
  categories: Category[];
  /** How many times each category has been used, so the favourites can be offered first. */
  usage: Record<string, number>;
  isLoaded: boolean;
  load: (db: SQLiteDatabase) => Promise<void>;
  create: (db: SQLiteDatabase, input: NewCategory) => Promise<Category>;
  update: (
    db: SQLiteDatabase,
    id: string,
    changes: Partial<Pick<Category, 'name' | 'icon' | 'color' | 'isArchived'>>
  ) => Promise<void>;
  archive: (db: SQLiteDatabase, id: string) => Promise<void>;
}

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  categories: [],
  usage: {},
  isLoaded: false,

  load: async (db) => {
    const [categories, usage] = await Promise.all([
      categoriesRepository.listCategories(db, { includeArchived: true }),
      categoryUsage(db),
    ]);
    set({ categories, usage, isLoaded: true });
  },

  create: async (db, input) => {
    const category = await categoriesRepository.createCategory(db, input);
    set({ categories: [...get().categories, category] });
    return category;
  },

  update: async (db, id, changes) => {
    await categoriesRepository.updateCategory(db, id, changes);
    await get().load(db);
  },

  archive: async (db, id) => {
    await categoriesRepository.archiveCategory(db, id);
    await get().load(db);
  },
}));

/**
 * Active (non-archived) categories, the common case for pickers. Filters in
 * a memo rather than in a zustand selector: a selector that returns a new
 * array on every call makes zustand v5 re-render forever.
 */
export function useActiveCategories(): Category[] {
  const categories = useCategoriesStore((state) => state.categories);
  const usage = useCategoriesStore((state) => state.usage);
  return useMemo(
    () =>
      categories
        .filter((category) => !category.isArchived)
        .sort(
          (a, b) =>
            (usage[b.id] ?? 0) - (usage[a.id] ?? 0) ||
            // Among equally used ones, the newest comes first so a category you just added is easy to find.
            b.createdAt - a.createdAt ||
            a.name.localeCompare(b.name)
        ),
    [categories, usage]
  );
}
