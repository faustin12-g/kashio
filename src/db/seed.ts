import type { SQLiteDatabase } from 'expo-sqlite';
import { generateId } from '../utils/id';
import type { Category } from '../models/types';

const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'>[] = [
  { name: 'Groceries', icon: 'cart-outline', color: '#22C55E', type: 'expense' },
  { name: 'Transport', icon: 'bus', color: '#3B82F6', type: 'expense' },
  { name: 'Rent', icon: 'home-outline', color: '#F97316', type: 'expense' },
  { name: 'Utilities', icon: 'lightbulb-outline', color: '#EAB308', type: 'expense' },
  { name: 'Health', icon: 'pill', color: '#EF4444', type: 'expense' },
  { name: 'Entertainment', icon: 'movie-open-outline', color: '#A855F7', type: 'expense' },
  { name: 'Eating out', icon: 'silverware-fork-knife', color: '#EC4899', type: 'expense' },
  { name: 'Other', icon: 'package-variant-closed', color: '#64748B', type: 'expense' },
  { name: 'Salary', icon: 'cash', color: '#10B981', type: 'income' },
  { name: 'Other income', icon: 'plus-circle-outline', color: '#14B8A6', type: 'income' },
];

/**
 * Populates a starter set of categories on first launch only. Never runs
 * again once the user has any category rows (including if they delete them
 * all), so it never fights with user edits or a restored backup.
 */
export async function seedDefaultCategories(db: SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories'
  );
  if ((existing?.count ?? 0) > 0) return;

  const seededFlag = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM meta WHERE key = 'seeded_default_categories'"
  );
  if (seededFlag) return;

  const now = Date.now();
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const category of DEFAULT_CATEGORIES) {
      await txn.runAsync(
        `INSERT INTO categories (id, name, icon, color, type, is_archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
        generateId(),
        category.name,
        category.icon,
        category.color,
        category.type,
        now,
        now
      );
    }
    await txn.runAsync(
      "INSERT OR REPLACE INTO meta (key, value) VALUES ('seeded_default_categories', '1')"
    );
  });
}
