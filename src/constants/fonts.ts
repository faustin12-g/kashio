import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';

/** The font files to load at start-up (Poppins, from Google Fonts). */
export const FONT_FILES = {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
};

/**
 * Font family names. Custom fonts on Android are picked by family, not by
 * `fontWeight`, so each weight has its own name. If a font failed to load the
 * system font is used instead and nothing breaks.
 */
export const fonts = {
  regular: 'Poppins_400Regular',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  extrabold: 'Poppins_800ExtraBold',
} as const;
