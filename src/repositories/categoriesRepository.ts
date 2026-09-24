import type { SQLiteDatabase } from 'expo-sqlite';
import type { Category, NewCategory } from '../models/types';
import { generateId } from '../utils/id';

interface CategoryRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
  is_archived: number;
  created_at: number;
  updated_at: number;
}

function fromRow(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    type: row.type,
    isArchived: row.is_archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCategories(
  db: SQLiteDatabase,
  options: { includeArchived?: boolean } = {}
): Promise<Category[]> {
  const rows = await db.getAllAsync<CategoryRow>(
    options.includeArchived
      ? 'SELECT * FROM categories ORDER BY name COLLATE NOCASE'
      : 'SELECT * FROM categories WHERE is_archived = 0 ORDER BY name COLLATE NOCASE'
  );
  return rows.map(fromRow);
}

export async function getCategory(db: SQLiteDatabase, id: string): Promise<Category | null> {
  const row = await db.getFirstAsync<CategoryRow>('SELECT * FROM categories WHERE id = ?', id);
  return row ? fromRow(row) : null;
}

export async function createCategory(db: SQLiteDatabase, input: NewCategory): Promise<Category> {
  const now = Date.now();
  const category: Category = {
    id: generateId(),
    name: input.name,
    icon: input.icon,
    color: input.color,
    type: input.type,
    isArchived: input.isArchived ?? false,
    createdAt: now,
    updatedAt: now,
  };
  await db.runAsync(
    `INSERT INTO categories (id, name, icon, color, type, is_archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    category.id,
    category.name,
    category.icon,
    category.color,
    category.type,
    category.isArchived ? 1 : 0,
    category.createdAt,
    category.updatedAt
  );
  return category;
}

export async function updateCategory(
  db: SQLiteDatabase,
  id: string,
  changes: Partial<Pick<Category, 'name' | 'icon' | 'color' | 'isArchived'>>
): Promise<void> {
  const current = await getCategory(db, id);
  if (!current) throw new Error(`Category ${id} not found`);
  const next = { ...current, ...changes, updatedAt: Date.now() };
  await db.runAsync(
    `UPDATE categories SET name = ?, icon = ?, color = ?, is_archived = ?, updated_at = ? WHERE id = ?`,
    next.name,
    next.icon,
    next.color,
    next.isArchived ? 1 : 0,
    next.updatedAt,
    id
  );
}

/**
 * Categories are archived, never hard-deleted, because past transactions
 * still reference them and we never want a transaction's category to
 * silently disappear from history.
 */
export async function archiveCategory(db: SQLiteDatabase, id: string): Promise<void> {
  await updateCategory(db, id, { isArchived: true });
}

/** Overwrites (or inserts) a category row exactly as given. Used only when applying a Drive backup. */
export async function upsertCategoryFromBackup(db: SQLiteDatabase, category: Category): Promise<void> {
  await db.runAsync(
    `INSERT INTO categories (id, name, icon, color, type, is_archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       icon = excluded.icon,
       color = excluded.color,
       type = excluded.type,
       is_archived = excluded.is_archived,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at`,
    category.id,
    category.name,
    category.icon,
    category.color,
    category.type,
    category.isArchived ? 1 : 0,
    category.createdAt,
    category.updatedAt
  );
}
