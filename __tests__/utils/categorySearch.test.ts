import { filterCategoriesByName, hasCategoryNamed } from '../../src/utils/categorySearch';
import type { Category } from '../../src/models/types';

function category(name: string): Category {
  return {
    id: name,
    name,
    icon: 'tag-outline',
    color: '#000000',
    type: 'expense',
    isArchived: false,
    createdAt: 0,
    updatedAt: 0,
  };
}

const CATEGORIES = [category('Groceries'), category('Eating out'), category('Rent'), category('Green fees')];

describe('filterCategoriesByName', () => {
  it('returns everything for an empty or blank query', () => {
    expect(filterCategoriesByName(CATEGORIES, '')).toHaveLength(4);
    expect(filterCategoriesByName(CATEGORIES, '   ')).toHaveLength(4);
  });

  it('matches case-insensitively anywhere in the name', () => {
    expect(filterCategoriesByName(CATEGORIES, 'GRE').map((c) => c.name)).toEqual(['Green fees']);
    expect(filterCategoriesByName(CATEGORIES, 'gr').map((c) => c.name)).toEqual(['Groceries', 'Green fees']);
    expect(filterCategoriesByName(CATEGORIES, 'out').map((c) => c.name)).toEqual(['Eating out']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterCategoriesByName(CATEGORIES, 'zzz')).toEqual([]);
  });

  it('also matches the translated name when one is supplied', () => {
    const translate = (category: Category) => (category.name === 'Groceries' ? 'Courses' : category.name);
    expect(filterCategoriesByName(CATEGORIES, 'cours', translate).map((c) => c.name)).toEqual(['Groceries']);
    expect(filterCategoriesByName(CATEGORIES, 'groc', translate).map((c) => c.name)).toEqual(['Groceries']);
  });
});

describe('hasCategoryNamed', () => {
  it('detects an exact name ignoring case and surrounding spaces', () => {
    expect(hasCategoryNamed(CATEGORIES, '  rent ')).toBe(true);
  });

  it('does not treat a partial match as existing', () => {
    expect(hasCategoryNamed(CATEGORIES, 'Gro')).toBe(false);
  });

  it('is false for an empty name', () => {
    expect(hasCategoryNamed(CATEGORIES, '  ')).toBe(false);
  });
});
