import {
  CATEGORY_ICON_OPTIONS,
  DEFAULT_CATEGORY_ICON,
  resolveCategoryIcon,
} from '../../src/constants/categoryIcons';

describe('resolveCategoryIcon', () => {
  it('returns a valid icon name unchanged', () => {
    expect(resolveCategoryIcon('cart-outline')).toBe('cart-outline');
  });

  it('maps a legacy emoji to the matching icon', () => {
    expect(resolveCategoryIcon('\u{1F6D2}')).toBe('cart-outline');
  });

  it('maps a legacy emoji that carries a variation selector', () => {
    expect(resolveCategoryIcon('\u{1F37D}\u{FE0F}')).toBe('silverware-fork-knife');
  });

  it('falls back to the default icon for an unknown emoji', () => {
    expect(resolveCategoryIcon('\u{1F984}')).toBe(DEFAULT_CATEGORY_ICON);
  });

  it('falls back to the default icon for empty or missing values', () => {
    expect(resolveCategoryIcon('')).toBe(DEFAULT_CATEGORY_ICON);
    expect(resolveCategoryIcon(null)).toBe(DEFAULT_CATEGORY_ICON);
    expect(resolveCategoryIcon(undefined)).toBe(DEFAULT_CATEGORY_ICON);
  });

  it('offers only unique icons in the picker', () => {
    expect(new Set(CATEGORY_ICON_OPTIONS).size).toBe(CATEGORY_ICON_OPTIONS.length);
  });
});
