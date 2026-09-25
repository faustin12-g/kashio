/** How long the app can sit in the background before it locks again. */
export const RELOCK_AFTER_MS = 30_000;

/** Whether the app should be locked when it returns to the foreground. */
export function shouldLockOnReturn(
  enabled: boolean,
  backgroundedAtMs: number | null,
  nowMs: number,
  graceMs: number = RELOCK_AFTER_MS
): boolean {
  if (!enabled || backgroundedAtMs === null) return false;
  return nowMs - backgroundedAtMs >= graceMs;
}

/** The choices offered in settings, in milliseconds. 0 means lock as soon as the app is left. */
export const LOCK_TIMEOUT_OPTIONS = [0, 30_000, 60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000] as const;

/** Reads a stored timeout, falling back to the default for anything that is not one of the offered choices. */
export function parseLockTimeout(stored: string | null | undefined): number {
  const value = stored === null || stored === undefined ? NaN : Number(stored);
  return (LOCK_TIMEOUT_OPTIONS as readonly number[]).includes(value) ? value : RELOCK_AFTER_MS;
}
