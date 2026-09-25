import { format, parseISO, subDays } from 'date-fns';
import type { TransactionFilter } from '../repositories/transactionsRepository';
import { parseAmountToMinor } from '../utils/money';

export type DatePreset = 'all' | 'month' | 'last30' | 'year' | 'custom';

/** What the user has chosen on the search and filter screen. */
export interface FilterState {
  search: string;
  type: 'all' | 'expense' | 'income';
  categoryId: string | null;
  accountId: string | null;
  datePreset: DatePreset;
  customFrom: string | null;
  customTo: string | null;
  /** Typed amounts, kept as text while editing. */
  minAmount: string;
  maxAmount: string;
}

export const EMPTY_FILTER: FilterState = {
  search: '',
  type: 'all',
  categoryId: null,
  accountId: null,
  datePreset: 'all',
  customFrom: null,
  customTo: null,
  minAmount: '',
  maxAmount: '',
};

/** The from/to dates (inclusive) for a date choice, or nothing for "all". */
export function dateRangeFor(
  state: Pick<FilterState, 'datePreset' | 'customFrom' | 'customTo'>,
  todayIso: string
): { from?: string; to?: string } {
  switch (state.datePreset) {
    case 'month':
      return { from: `${todayIso.slice(0, 7)}-01`, to: `${todayIso.slice(0, 7)}-31` };
    case 'last30':
      return { from: format(subDays(parseISO(todayIso), 29), 'yyyy-MM-dd'), to: todayIso };
    case 'year':
      return { from: `${todayIso.slice(0, 4)}-01-01`, to: `${todayIso.slice(0, 4)}-12-31` };
    case 'custom':
      return { from: state.customFrom ?? undefined, to: state.customTo ?? undefined };
    default:
      return {};
  }
}

/** Amount text to minor units, or undefined when blank or not a number. */
function optionalAmount(text: string): number | undefined {
  if (!text.trim()) return undefined;
  const minor = parseAmountToMinor(text);
  return Number.isNaN(minor) ? undefined : minor;
}

/** Turns the on-screen choices into the query the database understands. */
export function buildTransactionFilter(state: FilterState, todayIso: string): TransactionFilter {
  const filter: TransactionFilter = { ...dateRangeFor(state, todayIso) };
  const search = state.search.trim();
  if (search) filter.search = search;
  if (state.type !== 'all') filter.type = state.type;
  if (state.categoryId) filter.categoryId = state.categoryId;
  if (state.accountId) filter.accountId = state.accountId;
  const min = optionalAmount(state.minAmount);
  const max = optionalAmount(state.maxAmount);
  if (min !== undefined) filter.minMinor = min;
  if (max !== undefined) filter.maxMinor = max;
  return filter;
}

/** How many separate filters are switched on, for the badge on the filter button. Search text is not counted. */
export function activeFilterCount(state: FilterState): number {
  let count = 0;
  if (state.type !== 'all') count++;
  if (state.categoryId) count++;
  if (state.accountId) count++;
  if (state.datePreset !== 'all') count++;
  if (optionalAmount(state.minAmount) !== undefined || optionalAmount(state.maxAmount) !== undefined) count++;
  return count;
}

export function isFilterActive(state: FilterState): boolean {
  return activeFilterCount(state) > 0 || state.search.trim().length > 0;
}
