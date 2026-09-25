import { en } from '../../src/i18n/en';
import { fr } from '../../src/i18n/fr';
import { rw } from '../../src/i18n/rw';
import {
  categoryDisplayName,
  formatDateForLanguage,
  formatRelativeTime,
  interpolate,
  languageFromLocale,
  makeTranslator,
  parseLanguageSetting,
  resolveLanguage,
  shortMonthLabel,
  translate,
} from '../../src/i18n';

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe('translation files', () => {
  const keys = Object.keys(en) as (keyof typeof en)[];

  it('French and Kinyarwanda define exactly the same keys as English', () => {
    expect(Object.keys(fr).sort()).toEqual([...keys].sort());
    expect(Object.keys(rw).sort()).toEqual([...keys].sort());
  });

  it('never leave a translation empty', () => {
    for (const [name, dictionary] of Object.entries({ en, fr, rw })) {
      for (const key of keys) {
        expect([name, key, dictionary[key].trim().length > 0]).toEqual([name, key, true]);
      }
    }
  });

  it('keep the same {placeholders} as English, so no value is ever lost or invented', () => {
    for (const key of keys) {
      expect([key, placeholders(fr[key])]).toEqual([key, placeholders(en[key])]);
      expect([key, placeholders(rw[key])]).toEqual([key, placeholders(en[key])]);
    }
  });
});

describe('interpolate', () => {
  it('fills placeholders and converts numbers', () => {
    expect(interpolate('{a} of {b}', { a: 3, b: 'ten' })).toBe('3 of ten');
  });

  it('leaves an unknown placeholder visible instead of dropping it', () => {
    expect(interpolate('Hello {name}', {})).toBe('Hello {name}');
  });

  it('returns the text unchanged when there is nothing to fill', () => {
    expect(interpolate('Plain text')).toBe('Plain text');
  });
});

describe('translate', () => {
  it('looks the text up in the chosen language', () => {
    expect(translate('en', 'common.save')).toBe('Save');
    expect(translate('fr', 'common.save')).toBe('Enregistrer');
    expect(translate('rw', 'common.save')).toBe('Bika');
  });

  it('fills in values', () => {
    expect(translate('fr', 'alert.amounts', { spent: '8 000', limit: '10 000' })).toContain('8 000');
    expect(makeTranslator('en')('bud.ofLimit', { spent: 'A', limit: 'B' })).toBe('A of B');
  });
});

describe('language choice', () => {
  it('maps phone locales to a language, defaulting to English', () => {
    expect(languageFromLocale('fr-FR')).toBe('fr');
    expect(languageFromLocale('fr_CA')).toBe('fr');
    expect(languageFromLocale('rw-RW')).toBe('rw');
    expect(languageFromLocale('kin')).toBe('rw');
    expect(languageFromLocale('en-GB')).toBe('en');
    expect(languageFromLocale('de-DE')).toBe('en');
  });

  it('follows the phone unless a language was chosen', () => {
    expect(resolveLanguage('system', 'fr-FR')).toBe('fr');
    expect(resolveLanguage('rw', 'fr-FR')).toBe('rw');
  });

  it('falls back to following the phone for an unknown stored value', () => {
    expect(parseLanguageSetting('klingon')).toBe('system');
    expect(parseLanguageSetting(null)).toBe('system');
    expect(parseLanguageSetting('fr')).toBe('fr');
  });
});

describe('categoryDisplayName', () => {
  const t = makeTranslator('fr');

  it('translates the starter categories', () => {
    expect(categoryDisplayName('Groceries', t)).toBe('Courses');
    expect(categoryDisplayName('Eating out', t)).toBe('Restaurants');
  });

  it('leaves a category the user created exactly as they typed it', () => {
    expect(categoryDisplayName('My side project', t)).toBe('My side project');
  });
});

describe('dates', () => {
  it('formats a date in each language', () => {
    expect(formatDateForLanguage('2026-09-24', 'en')).toBe('Thu, 24 Sep 2026');
    expect(formatDateForLanguage('2026-09-24', 'fr')).toContain('24');
    expect(formatDateForLanguage('2026-09-24', 'rw')).toBe('24 Nzeri 2026');
  });

  it('gives short month labels for charts', () => {
    expect(shortMonthLabel('2026-09', 'en')).toBe('Sep');
    expect(shortMonthLabel('2026-09', 'rw')).toBe('Nze');
  });
});

describe('formatRelativeTime', () => {
  const t = makeTranslator('en');
  const now = 1_000_000_000_000;

  it('describes recent times in the largest sensible unit', () => {
    expect(formatRelativeTime(now - 20_000, t, now)).toBe('just now');
    expect(formatRelativeTime(now - 5 * 60_000, t, now)).toBe('5 min ago');
    expect(formatRelativeTime(now - 3 * 3_600_000, t, now)).toBe('3 h ago');
    expect(formatRelativeTime(now - 2 * 86_400_000, t, now)).toBe('2 d ago');
  });

  it('never shows a negative time if the clock is slightly off', () => {
    expect(formatRelativeTime(now + 60_000, t, now)).toBe('just now');
  });
});
