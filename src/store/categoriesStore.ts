import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Category, NewCategory } from '../models/types';
import * as categoriesRepository from '../repositories/categoriesRepository';

interface CategoriesState {
  categories: Category[];
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
  isLoaded: false,

  load: async (db) => {
    const categories = await categoriesRepository.listCategories(db, { includeArchived: true });
    set({ categories, isLoaded: true });
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

/** Active (non-archived) categories, the common case for pickers. */
export function selectActiveCategories(state: CategoriesState): Category[] {
  return state.categories.filter((category) => !category.isArchived);
}
