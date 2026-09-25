import type { Category } from '../models/types';

/**
 * Case-insensitive "contains" match on the category name. An empty query
 * returns everything. Pass `displayName` to also match the translated name a
 * person actually sees, e.g. "Courses" for the starter category "Groceries".
 */
export function filterCategoriesByName(
  categories: Category[],
  query: string,
  displayName?: (category: Category) => string
): Category[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return categories;
  return categories.filter(
    (category) =>
      category.name.toLowerCase().includes(needle) ||
      (displayName ? displayName(category).toLowerCase().includes(needle) : false)
  );
}

/** True when a category with exactly this name (ignoring case and spacing) already exists. */
export function hasCategoryNamed(categories: Category[], name: string): boolean {
  const needle = name.trim().toLowerCase();
  if (!needle) return false;
  return categories.some((category) => category.name.trim().toLowerCase() === needle);
}
