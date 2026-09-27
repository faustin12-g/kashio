import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { Screen } from '../components/Screen';
import { fonts } from '../constants/fonts';
import { useTheme, spacing } from '../constants/theme';
import { useTranslation } from '../i18n/useTranslation';
import type { TranslationKey } from '../i18n';

const SECTIONS: { headingKey: TranslationKey; bodyKey: TranslationKey }[] = [
  { headingKey: 'privacy.s1Heading', bodyKey: 'privacy.s1Body' },
  { headingKey: 'privacy.s2Heading', bodyKey: 'privacy.s2Body' },
  { headingKey: 'privacy.s3Heading', bodyKey: 'privacy.s3Body' },
  { headingKey: 'privacy.s4Heading', bodyKey: 'privacy.s4Body' },
  { headingKey: 'privacy.s5Heading', bodyKey: 'privacy.s5Body' },
  { headingKey: 'privacy.s6Heading', bodyKey: 'privacy.s6Body' },
  { headingKey: 'privacy.s7Heading', bodyKey: 'privacy.s7Body' },
];

/**
 * A plain-language privacy policy that describes what Kashio actually does —
 * not boilerplate. Written by the developer, not a lawyer; worth a legal
 * review before this is relied on for a store listing.
 */
export default function PrivacyScreen() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Screen>
      <Stack.Screen options={{ title: t('about.privacy') }} />
      <Text style={{ color: theme.textMuted, fontSize: 13 }}>{t('privacy.updated')}</Text>
      <Text style={{ color: theme.text, lineHeight: 20 }}>{t('privacy.intro')}</Text>

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
