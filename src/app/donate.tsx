import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { fonts } from '../constants/fonts';
import { useTheme, spacing } from '../constants/theme';
import { useTranslation } from '../i18n/useTranslation';

/** Support Kashio's development. No payment details are wired up yet — see the note in the reply that shipped this screen. */
export default function DonateScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Screen>
      <Stack.Screen options={{ title: t('donate.title') }} />

      <View style={styles.hero}>
        <View style={[styles.icon, { backgroundColor: theme.primary + '1A' }]}>
          <Icon name="hand-heart-outline" size={36} color={theme.primary} />
        </View>
        <Text style={[styles.heading, { color: theme.text }]}>{t('donate.heading')}</Text>
        <Text style={{ color: theme.textMuted, textAlign: 'center' }}>{t('donate.body')}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
        <Text style={{ color: theme.textMuted, fontSize: 13, lineHeight: 19 }}>{t('donate.comingSoon')}</Text>
      </View>

      <Button label={t('contact.title')} variant="secondary" onPress={() => router.push('/contact')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 10, paddingVertical: spacing.md },
  icon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 19, fontFamily: fonts.bold },
  card: { borderRadius: 14, borderWidth: 1, padding: spacing.md },
});
