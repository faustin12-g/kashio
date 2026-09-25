import { format, parseISO } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale/fr';
import { en, type TranslationKey, type Translations } from './en';
import { fr } from './fr';
import { rw } from './rw';

export type Language = 'en' | 'fr' | 'rw';
export type LanguageSetting = 'system' | Language;

export type { TranslationKey };
export type TranslateParams = Record<string, string | number>;
export type TFunction = (key: TranslationKey, params?: TranslateParams) => string;

const DICTIONARIES: Record<Language, Translations> = { en, fr, rw };

/** Language names are shown in their own language so anyone can find theirs. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  fr: 'Français',
  rw: 'Kinyarwanda',
};

export const DEFAULT_LANGUAGE_SETTING: LanguageSetting = 'system';

export function parseLanguageSetting(stored: string | null | undefined): LanguageSetting {
  return stored === 'system' || stored === 'en' || stored === 'fr' || stored === 'rw'
    ? stored
    : DEFAULT_LANGUAGE_SETTING;
}

/** The phone's language, e.g. "fr-RW" or "rw-RW". Falls back to English if it cannot be read. */
export function deviceLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en';
  } catch {
    return 'en';
  }
}

/** Maps a locale like "fr-CA" or "rw-RW" to a language we have, or English. */
export function languageFromLocale(locale: string): Language {
  const primary = locale.toLowerCase().split(/[-_]/)[0];
  if (primary === 'fr') return 'fr';
  if (primary === 'rw' || primary === 'kin') return 'rw';
  return 'en';
}

export function resolveLanguage(setting: LanguageSetting, locale: string = deviceLocale()): Language {
  return setting === 'system' ? languageFromLocale(locale) : setting;
}

/** Fills `{name}` style placeholders. An unknown placeholder is left visible rather than silently dropped. */
export function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole
  );
}

export function translate(language: Language, key: TranslationKey, params?: TranslateParams): string {
  return interpolate(DICTIONARIES[language][key] ?? en[key], params);
}

export function makeTranslator(language: Language): TFunction {
  return (key, params) => translate(language, key, params);
}

/** The translated name for one of the ten starter categories, or the name as typed for anything else. */
export function categoryDisplayName(name: string, t: TFunction): string {
  const key = `defaultCat.${name}` as TranslationKey;
  return key in en ? t(key) : name;
}

// ---- dates ----

const RW_MONTHS = [
  'Mutarama',
  'Gashyantare',
  'Werurwe',
  'Mata',
  'Gicurasi',
  'Kamena',
  'Nyakanga',
  'Kanama',
  'Nzeri',
  'Ukwakira',
  'Ugushyingo',
  'Ukuboza',
];

/** e.g. "Thu, 24 Sep 2026", "jeu. 24 sept. 2026", "24 Nzeri 2026". */
export function formatDateForLanguage(iso: string, language: Language): string {
  const date = parseISO(iso);
  if (language === 'fr') return format(date, 'EEE d MMM yyyy', { locale: frLocale });
  if (language === 'rw') return `${date.getDate()} ${RW_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  return format(date, 'EEE, d MMM yyyy');
}

/** e.g. "September 2026", "septembre 2026", "Nzeri 2026". */
export function formatMonthForLanguage(iso: string, language: Language): string {
  const date = parseISO(iso);
  if (language === 'fr') return format(date, 'LLLL yyyy', { locale: frLocale });
  if (language === 'rw') return `${RW_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  return format(date, 'MMMM yyyy');
}

/** Short month label for a chart, from a yyyy-MM key: "Sep", "sept.", "Nzeri". */
export function shortMonthLabel(month: string, language: Language): string {
  const date = parseISO(`${month}-01`);
  if (language === 'fr') return format(date, 'MMM', { locale: frLocale });
  if (language === 'rw') return RW_MONTHS[date.getMonth()].slice(0, 3);
  return format(date, 'MMM');
}

/** "just now", "5 min ago", "3 h ago", "2 d ago" in the user's language. */
export function formatRelativeTime(epochMs: number, t: TFunction, nowMs: number = Date.now()): string {
  const minutes = Math.floor(Math.max(0, nowMs - epochMs) / 60000);
  if (minutes < 1) return t('time.justNow');
  if (minutes < 60) return t('time.minutesAgo', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('time.hoursAgo', { n: hours });
  return t('time.daysAgo', { n: Math.floor(hours / 24) });
}
