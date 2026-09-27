import React from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Screen } from '../components/Screen';
import { ListRow } from '../components/ListRow';
import { Logo } from '../components/Logo';
import { fonts } from '../constants/fonts';
import { useTheme } from '../constants/theme';
import { useTranslation } from '../i18n/useTranslation';

/** The Play Store address Kashio will live at once published — safe to link to now; it simply starts working then. */
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.kashio.app';

export default function AboutScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const version = Constants.expoConfig?.version ?? '';

  const handleShare = async () => {
    try {
      await Share.share({ message: t('about.shareMessage') });
    } catch {
      // Sharing being cancelled or unavailable is not an error worth reporting.
    }
  };

  const handleRate = () => {
    Linking.openURL(PLAY_STORE_URL).catch(() => Alert.alert(t('about.rateUnavailableTitle'), t('about.rateUnavailableMessage')));
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('about.title') }} />

      <View style={styles.hero}>
        <Logo size={64} />
        <Text style={[styles.name, { color: theme.text }]}>Kashio</Text>
        {version ? <Text style={{ color: theme.textMuted, fontSize: 13 }}>{t('about.version', { version })}</Text> : null}
        <Text style={{ color: theme.textMuted, textAlign: 'center' }}>{t('about.tagline')}</Text>
      </View>

      <View style={styles.group}>
        <ListRow
          icon="help-circle-outline"
          color="#4F46E5"
          title={t('help.title')}
          subtitle={t('about.helpHint')}
          onPress={() => router.push('/help')}
          showChevron
        />
        <ListRow
          icon="email-outline"
          color="#0EA5E9"
          title={t('contact.title')}
          subtitle={t('about.contactHint')}
          onPress={() => router.push('/contact')}
          showChevron
        />
      </View>

      <View style={styles.group}>
        <ListRow
          icon="share-variant-outline"
          color="#10B981"
          title={t('about.share')}
          subtitle={t('about.shareHint')}
          onPress={handleShare}
        />
        <ListRow
          icon="star-outline"
          color="#F59E0B"
          title={t('about.rate')}
          subtitle={t('about.rateHint')}
          onPress={handleRate}
        />
        <ListRow
          icon="hand-heart-outline"
          color="#EC4899"
          title={t('about.donate')}
          subtitle={t('about.donateHint')}
          onPress={() => router.push('/donate')}
          showChevron
        />
      </View>

      <View style={styles.group}>
        <ListRow
          icon="shield-lock-outline"
          color={theme.textMuted}
          title={t('about.privacy')}
          onPress={() => router.push('/privacy')}
          showChevron
        />
        <ListRow
          icon="file-document-outline"
          color={theme.textMuted}
          title={t('about.terms')}
          onPress={() => router.push('/terms')}
          showChevron
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  name: { fontSize: 22, fontFamily: fonts.extrabold },
  group: { gap: 10 },
});
