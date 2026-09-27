import type { Language } from '../i18n';

export interface ReleaseNote {
  version: string;
  lines: Record<Language, string[]>;
}

/**
 * A short "what's new" for the version currently on top. Add one entry per
 * release that has something worth telling a returning user about; a
 * version with nothing user-facing to say can simply be left out.
 */
export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: '1.9.0',
    lines: {
      en: [
        'New: a Help page under About explains how every part of Kashio works, anytime.',
        'New: About also has Share, Rate us, Support Kashio, Privacy Policy and Terms.',
        'Contact us directly at info@iwhda.org from the About page.',
      ],
      fr: [
        "Nouveau : une page Aide sous À propos explique comment fonctionne chaque partie de Kashio, à tout moment.",
        'Nouveau : À propos propose aussi Partager, Nous noter, Soutenir Kashio, la Politique de confidentialité et les Conditions.',
        'Contactez-nous directement à info@iwhda.org depuis la page À propos.',
      ],
      rw: [
        'Gishya: paji y’Ubufasha iri munsi ya "Ibijyanye na app" isobanura uko buri gice cya Kashio gikora, igihe cyose.',
        'Gishya: "Ibijyanye na app" ifite na Gusangiza, Guha amanota, Gufasha Kashio, Politiki y’ibanga n’Amabwiriza.',
        'Twandikire ako kanya kuri info@iwhda.org uva kuri paji "Ibijyanye na app".',
      ],
    },
  },
  {
    version: '1.6.0',
    lines: {
      en: [
        'Home now shows this week and this year, not just this month and all time.',
        'Deleting a transaction, budget, goal or debt now offers a few seconds to undo it.',
        'Notifications can be searched, and cleared all at once.',
      ],
      fr: [
        "L'accueil affiche maintenant cette semaine et cette année, en plus de ce mois-ci et depuis le début.",
        'Supprimer une transaction, un budget, un objectif ou une dette propose désormais quelques secondes pour annuler.',
        'Les notifications peuvent être recherchées, et toutes effacées en une fois.',
      ],
      rw: [
        "Ahabanza none herekana iki cyumweru n'uyu mwaka, atari gusa uku kwezi n'igihe cyose.",
        'Gusiba igikorwa, ingengo y’imari, intego cyangwa umwenda none bikubwira uburyo bwo kubisubiza mu masegonda macye.',
        'Ubutumwa burashobora gushakishwa, kandi bugasibwa bwose rimwe.',
      ],
    },
  },
];
