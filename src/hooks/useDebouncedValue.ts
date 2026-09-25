import { useEffect, useState } from 'react';

/** A copy of `value` that only changes after it has stopped changing for `delayMs`. Used so typing in a search box does not query on every key. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
