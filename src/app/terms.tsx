import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { Screen } from '../components/Screen';
import { fonts } from '../constants/fonts';
import { useTheme, spacing } from '../constants/theme';
import { useTranslation } from '../i18n/useTranslation';
import type { TranslationKey } from '../i18n';

const SECTIONS: { headingKey: TranslationKey; bodyKey: TranslationKey }[] = [
  { headingKey: 'terms.s1Heading', bodyKey: 'terms.s1Body' },
  { headingKey: 'terms.s2Heading', bodyKey: 'terms.s2Body' },
  { headingKey: 'terms.s3Heading', bodyKey: 'terms.s3Body' },
  { headingKey: 'terms.s4Heading', bodyKey: 'terms.s4Body' },
  { headingKey: 'terms.s5Heading', bodyKey: 'terms.s5Body' },
  { headingKey: 'terms.s6Heading', bodyKey: 'terms.s6Body' },
];

/**
 * Plain-language terms, written by the developer, not a lawyer — worth a
 * legal review before this is relied on for a store listing.
 */
export default function TermsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Screen>
      <Stack.Screen options={{ title: t('about.terms') }} />
      <Text style={{ color: theme.textMuted, fontSize: 13 }}>{t('terms.updated')}</Text>
      <Text style={{ color: theme.text, lineHeight: 20 }}>{t('terms.intro')}</Text>

      <View style={{ gap: spacing.lg }}>
        {SECTIONS.map((section) => (
          <View key={section.headingKey} style={styles.section}>
            <Text style={[styles.heading, { color: theme.text }]}>{t(section.headingKey)}</Text>
            <Text style={{ color: theme.textMuted, lineHeight: 20 }}>{t(section.bodyKey)}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: 6 },
  heading: { fontSize: 15, fontFamily: fonts.bold },
});
