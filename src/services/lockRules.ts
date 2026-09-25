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
