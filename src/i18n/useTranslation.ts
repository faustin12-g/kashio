import { useMemo } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { makeTranslator, resolveLanguage, type Language, type TFunction } from './index';

/** The translate function and current language for a screen or component. */
export function useTranslation(): { t: TFunction; language: Language } {
  const setting = useSettingsStore((state) => state.language);
  return useMemo(() => {
    const language = resolveLanguage(setting);
    return { t: makeTranslator(language), language };
  }, [setting]);
}

/** The translate function and language for code that is not a React component (notifications, background work). */
export function currentTranslation(): { t: TFunction; language: Language } {
  const language = resolveLanguage(useSettingsStore.getState().language);
  return { t: makeTranslator(language), language };
}
