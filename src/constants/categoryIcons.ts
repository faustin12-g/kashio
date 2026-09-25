import type { IconName } from '../components/Icon';

export const DEFAULT_CATEGORY_ICON: IconName = 'tag-outline';

/** Icons offered when creating a category. Stored in the database by name. */
export const CATEGORY_ICON_OPTIONS: IconName[] = [
  'cart-outline',
  'silverware-fork-knife',
  'coffee-outline',
  'bus',
  'car-outline',
  'gas-station-outline',
  'home-outline',
  'lightbulb-outline',
  'wifi',
  'cellphone',
  'pill',
  'heart-outline',
  'movie-open-outline',
  'gift-outline',
  'shopping-outline',
  'tshirt-crew-outline',
  'airplane',
  'school-outline',
  'book-open-variant-outline',
  'dumbbell',
  'paw',
  'baby-carriage',
  'wrench-outline',
  'package-variant-closed',
  'cash',
  'hand-coin-outline',
  'briefcase-outline',
  'bank-outline',
  'piggy-bank-outline',
  'chart-line',
  'plus-circle-outline',
  'tag-outline',
];

const OPTION_SET = new Set<string>(CATEGORY_ICON_OPTIONS);

/**
 * Older versions of the app stored an emoji in the category's icon field.
 * Those values (still present in existing databases and old Drive backups)
 * are mapped to the closest icon. Written as code point escapes so this
 * file itself contains no emoji.
 */
const LEGACY_EMOJI_TO_ICON: Record<string, IconName> = {
  '\u{1F6D2}': 'cart-outline',
  '\u{1F68C}': 'bus',
  '\u{1F3E0}': 'home-outline',
  '\u{1F4A1}': 'lightbulb-outline',
  '\u{1F48A}': 'pill',
  '\u{1F3AC}': 'movie-open-outline',
  '\u{1F37D}': 'silverware-fork-knife',
  '\u{1F4E6}': 'package-variant-closed',
  '\u{1F4B0}': 'cash',
  '\u{2795}': 'plus-circle-outline',
  '\u{1F3F7}': 'tag-outline',
};

const VARIATION_SELECTOR = '\u{FE0F}';

/** Turns whatever is stored in a category's icon field into a valid icon name. */
export function resolveCategoryIcon(stored: string | null | undefined): IconName {
  if (!stored) return DEFAULT_CATEGORY_ICON;
  if (OPTION_SET.has(stored)) return stored as IconName;
  const legacy = LEGACY_EMOJI_TO_ICON[stored.split(VARIATION_SELECTOR).join('')];
  return legacy ?? DEFAULT_CATEGORY_ICON;
}
