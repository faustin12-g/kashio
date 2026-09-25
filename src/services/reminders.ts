import { currentTranslation } from '../i18n/useTranslation';
import { cancelDailyReminder, scheduleDailyReminder } from './notifications';

/** Splits "20:30" into numbers. Anything else falls back to 20:00. */
export function parseTime(time: string): { hour: number; minute: number } {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return match ? { hour: Number(match[1]), minute: Number(match[2]) } : { hour: 20, minute: 0 };
}

export function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Makes the phone's scheduled reminder match the settings: on at the chosen
 * time in the current language, or off. Call it on start-up and whenever the
 * reminder or the language changes. Returns false if the user turned the
 * reminder on but notifications are not allowed.
 */
export async function syncDailyReminder(enabled: boolean, time: string): Promise<boolean> {
  if (!enabled) {
    await cancelDailyReminder();
    return true;
  }
  const { t } = currentTranslation();
  const { hour, minute } = parseTime(time);
  return scheduleDailyReminder(hour, minute, t('set.reminderTitle'), t('set.reminderBody'));
}
