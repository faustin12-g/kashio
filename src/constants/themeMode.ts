/** How the app picks its colors: follow the phone, or force light or dark. */
export type ThemeMode = 'system' | 'light' | 'dark';

export const DEFAULT_THEME_MODE: ThemeMode = 'system';

export const THEME_MODE_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'Phone' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/** Turns whatever was stored into a valid mode, falling back to following the phone. */
export function parseThemeMode(stored: string | null | undefined): ThemeMode {
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : DEFAULT_THEME_MODE;
}
