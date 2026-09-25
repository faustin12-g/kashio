import { useCallback } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { formatMoney } from '../utils/money';

/**
 * Formats an amount in the one currency chosen in Settings. Every amount in
 * the app goes through this, so changing the currency updates everything and
 * a row saved under an older currency can never show a different one.
 */
export function useMoney(): (minor: number) => string {
  const currency = useSettingsStore((state) => state.currency);
  return useCallback((minor: number) => formatMoney(minor, currency), [currency]);
}
