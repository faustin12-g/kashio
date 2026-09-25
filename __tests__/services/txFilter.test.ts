import {
  EMPTY_FILTER,
  activeFilterCount,
  buildTransactionFilter,
  dateRangeFor,
  isFilterActive,
  type FilterState,
} from '../../src/services/txFilter';

const TODAY = '2026-09-24';
const state = (overrides: Partial<FilterState>): FilterState => ({ ...EMPTY_FILTER, ...overrides });

describe('dateRangeFor', () => {
  it('has no limits for all time', () => {
    expect(dateRangeFor(state({}), TODAY)).toEqual({});
  });

  it('covers the current calendar month', () => {
    expect(dateRangeFor(state({ datePreset: 'month' }), TODAY)).toEqual({ from: '2026-09-01', to: '2026-09-31' });
  });

  it('covers the last 30 days including today', () => {
    expect(dateRangeFor(state({ datePreset: 'last30' }), TODAY)).toEqual({ from: '2026-08-26', to: '2026-09-24' });
  });

  it('covers the whole current year', () => {
    expect(dateRangeFor(state({ datePreset: 'year' }), TODAY)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });

  it('uses the chosen custom dates, either of which may be open', () => {
    expect(dateRangeFor(state({ datePreset: 'custom', customFrom: '2026-03-01', customTo: null }), TODAY)).toEqual({
      from: '2026-03-01',
      to: undefined,
    });
  });
});

describe('buildTransactionFilter', () => {
  it('produces an empty filter when nothing is chosen', () => {
    expect(buildTransactionFilter(EMPTY_FILTER, TODAY)).toEqual({});
  });

  it('carries every choice through', () => {
    const filter = buildTransactionFilter(
      state({
        search: '  milk ',
        type: 'expense',
        categoryId: 'c1',
        accountId: 'a1',
        datePreset: 'year',
        minAmount: '10',
        maxAmount: '250.50',
      }),
      TODAY
    );
    expect(filter).toEqual({
      from: '2026-01-01',
      to: '2026-12-31',
      search: 'milk',
      type: 'expense',
      categoryId: 'c1',
      accountId: 'a1',
      minMinor: 1000,
      maxMinor: 25050,
    });
  });

  it('ignores blank or unreadable amounts instead of filtering on nonsense', () => {
    const filter = buildTransactionFilter(state({ minAmount: '  ', maxAmount: 'abc' }), TODAY);
    expect(filter.minMinor).toBeUndefined();
    expect(filter.maxMinor).toBeUndefined();
  });

  it('keeps a minimum of zero, which is a real limit', () => {
    expect(buildTransactionFilter(state({ minAmount: '0' }), TODAY).minMinor).toBe(0);
  });
});

describe('activeFilterCount / isFilterActive', () => {
  it('counts each switched-on filter once, and not the search text', () => {
    expect(activeFilterCount(EMPTY_FILTER)).toBe(0);
    expect(activeFilterCount(state({ search: 'milk' }))).toBe(0);
    expect(activeFilterCount(state({ type: 'income', categoryId: 'c', datePreset: 'month' }))).toBe(3);
    expect(activeFilterCount(state({ minAmount: '5', maxAmount: '9' }))).toBe(1);
  });

  it('treats search text as making the list "filtered" for the clear button', () => {
    expect(isFilterActive(EMPTY_FILTER)).toBe(false);
    expect(isFilterActive(state({ search: 'milk' }))).toBe(true);
    expect(isFilterActive(state({ type: 'expense' }))).toBe(true);
  });
});
