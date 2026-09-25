import type { TFunction } from '../i18n';
import type { Pace } from './pace';

export type PaceTone = 'good' | 'warning' | 'danger' | 'muted';

/** The sentence and colour theme for a budget's spending forecast, or null when there is nothing worth saying. */
export function describePace(
  pace: Pace,
  t: TFunction,
  formatAmount: (minor: number) => string
): { text: string; tone: PaceTone } | null {
  switch (pace.status) {
    case 'no_spending':
      return null;
    case 'too_early':
      return { text: t('pace.tooEarly'), tone: 'muted' };
    case 'over':
      return { text: t('pace.over'), tone: 'danger' };
    case 'on_track':
      return {
        text: `${t('pace.onTrack')} ${t('pace.projected', { amount: formatAmount(pace.projectedMinor) })}`,
        tone: 'good',
      };
    case 'will_run_out': {
      const days = pace.daysUntilRunOut ?? 0;
      const text =
        days <= 0
          ? t('pace.willRunOutToday')
          : days === 1
            ? t('pace.willRunOutOne')
            : t('pace.willRunOut', { days });
      return { text, tone: 'warning' };
    }
  }
}
