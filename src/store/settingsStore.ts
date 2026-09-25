import { Appearance } from 'react-native';
import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getMeta, setMeta, META_KEYS } from '../repositories/metaRepository';
import { DEFAULT_THEME_MODE, parseThemeMode, type ThemeMode } from '../constants/themeMode';
import { parseLockTimeout, RELOCK_AFTER_MS } from '../services/lockRules';
import { DEFAULT_LANGUAGE_SETTING, parseLanguageSetting, type LanguageSetting } from '../i18n';

export const DEFAULT_CURRENCY = 'USD';
export const DEFAULT_REMINDER_TIME = '20:00';

/**
 * Tells the OS-level appearance to follow this choice. 'unspecified' hands
 * control back to the phone. Because everything (including system dialogs
 * such as the date picker) reads that same setting, one call themes the
 * whole app.
 */
function applyThemeMode(mode: ThemeMode): void {
  Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
}

/** Reads a stored "1"/"0" flag, with a default for when nothing has been stored yet. */
function parseFlag(stored: string | null, fallback: boolean): boolean {
  return stored === null ? fallback : stored === '1';
}

/** Accepts only a valid 24-hour "HH:mm" time. */
export function parseReminderTime(stored: string | null | undefined): string {
  return stored && /^([01]\d|2[0-3]):[0-5]\d$/.test(stored) ? stored : DEFAULT_REMINDER_TIME;
}

interface SettingsState {
  currency: string;
  themeMode: ThemeMode;
  language: LanguageSetting;
  reminderEnabled: boolean;
  reminderTime: string;
  appLockEnabled: boolean;
  /** How long the app may stay in the background before it locks again, in milliseconds. */
  lockTimeoutMs: number;
  autoBackupEnabled: boolean;
  autoBackupWifiOnly: boolean;
  onboardingDone: boolean;
  isLoaded: boolean;
  load: (db: SQLiteDatabase) => Promise<void>;
  setCurrency: (db: SQLiteDatabase, currency: string) => Promise<void>;
  setThemeMode: (db: SQLiteDatabase, mode: ThemeMode) => Promise<void>;
  setLanguage: (db: SQLiteDatabase, language: LanguageSetting) => Promise<void>;
  setReminder: (db: SQLiteDatabase, enabled: boolean, time: string) => Promise<void>;
  setAppLockEnabled: (db: SQLiteDatabase, enabled: boolean) => Promise<void>;
  setLockTimeout: (db: SQLiteDatabase, timeoutMs: number) => Promise<void>;
  setAutoBackup: (db: SQLiteDatabase, enabled: boolean, wifiOnly: boolean) => Promise<void>;
  completeOnboarding: (db: SQLiteDatabase) => Promise<void>;
}

const flag = (value: boolean) => (value ? '1' : '0');

export const useSettingsStore = create<SettingsState>((set) => ({
  currency: DEFAULT_CURRENCY,
  themeMode: DEFAULT_THEME_MODE,
  language: DEFAULT_LANGUAGE_SETTING,
  reminderEnabled: false,
  reminderTime: DEFAULT_REMINDER_TIME,
  appLockEnabled: false,
  lockTimeoutMs: RELOCK_AFTER_MS,
  autoBackupEnabled: false,
  autoBackupWifiOnly: true,
  onboardingDone: false,
  isLoaded: false,

  load: async (db) => {
    const [currency, theme, language, reminderOn, reminderTime, lock, lockTimeout, autoOn, autoWifi, onboarding] =
      await Promise.all([
        getMeta(db, META_KEYS.currency),
        getMeta(db, META_KEYS.themeMode),
        getMeta(db, META_KEYS.language),
        getMeta(db, META_KEYS.reminderEnabled),
        getMeta(db, META_KEYS.reminderTime),
        getMeta(db, META_KEYS.appLockEnabled),
        getMeta(db, META_KEYS.lockTimeout),
        getMeta(db, META_KEYS.autoBackupEnabled),
        getMeta(db, META_KEYS.autoBackupWifiOnly),
        getMeta(db, META_KEYS.onboardingDone),
      ]);
    const themeMode = parseThemeMode(theme);
    applyThemeMode(themeMode);
    set({
      currency: currency ?? DEFAULT_CURRENCY,
      themeMode,
      language: parseLanguageSetting(language),
      reminderEnabled: parseFlag(reminderOn, false),
      reminderTime: parseReminderTime(reminderTime),
      appLockEnabled: parseFlag(lock, false),
      lockTimeoutMs: parseLockTimeout(lockTimeout),
      autoBackupEnabled: parseFlag(autoOn, false),
      autoBackupWifiOnly: parseFlag(autoWifi, true),
      onboardingDone: parseFlag(onboarding, false),
      isLoaded: true,
    });
  },

  setCurrency: async (db, currency) => {
    await setMeta(db, META_KEYS.currency, currency);
    set({ currency });
  },

  setThemeMode: async (db, mode) => {
    applyThemeMode(mode);
    set({ themeMode: mode });
    await setMeta(db, META_KEYS.themeMode, mode);
  },

  setLanguage: async (db, language) => {
    set({ language });
    await setMeta(db, META_KEYS.language, language);
  },

  setReminder: async (db, enabled, time) => {
    set({ reminderEnabled: enabled, reminderTime: time });
    await setMeta(db, META_KEYS.reminderEnabled, flag(enabled));
    await setMeta(db, META_KEYS.reminderTime, time);
  },

  setAppLockEnabled: async (db, enabled) => {
    set({ appLockEnabled: enabled });
    await setMeta(db, META_KEYS.appLockEnabled, flag(enabled));
  },

  setLockTimeout: async (db, timeoutMs) => {
    set({ lockTimeoutMs: timeoutMs });
    await setMeta(db, META_KEYS.lockTimeout, String(timeoutMs));
  },

  setAutoBackup: async (db, enabled, wifiOnly) => {
    set({ autoBackupEnabled: enabled, autoBackupWifiOnly: wifiOnly });
    await setMeta(db, META_KEYS.autoBackupEnabled, flag(enabled));
    await setMeta(db, META_KEYS.autoBackupWifiOnly, flag(wifiOnly));
  },

  completeOnboarding: async (db) => {
    set({ onboardingDone: true });
    await setMeta(db, META_KEYS.onboardingDone, '1');
  },
}));
